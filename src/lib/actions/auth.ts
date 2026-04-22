"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";
import { canBootstrapAsAdmin } from "@/lib/utils/admin-emails";
import { isSupabaseAuthCookieName } from "@/lib/utils/auth-cookies";
import {
  signRecoveryToken,
  verifyRecoveryToken,
  signPending2faToken,
  verifyPending2faToken,
} from "@/lib/utils/recovery-token";
import {
  rateLimitByIp,
  rateLimitByIpAndEmail,
  rateLimitByEmail,
  getClientIp,
} from "@/lib/utils/rate-limit";
import { validatePassword } from "@/lib/utils/password-policy";

// H1: constant-time targets for flows that could leak account existence via
// response latency. Pad all outcomes to the same minimum duration so bcrypt /
// HTTP round-trip differences aren't measurable.
const LOGIN_MIN_MS = 600;
const RESET_REQUEST_MIN_MS = 500;
const SIGNUP_CHECK_MIN_MS = 450;

async function padTiming(startedAt: number, minMs: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed < minMs) {
    await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
  }
}

type ActionState = {
  message?: string;
  success?: boolean;
} | null;

// ── Shared cookie options ──────────────────────────────────────────────
const SHORT_COOKIE_MAX_AGE = 600; // 10 minutes

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict";
  maxAge: number;
  path: string;
};

function shortCookieOptions(path: string = "/"): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SHORT_COOKIE_MAX_AGE,
    path,
  };
}

// ── Audit log helper ───────────────────────────────────────────────────
type AuthAuditAction =
  | "login_success"
  | "login_failure"
  | "otp_verify_success"
  | "otp_verify_failure"
  | "password_reset_requested"
  | "password_changed"
  | "logout"
  | "user_invited"
  | "role_change";

type AuditOpts = {
  actorId?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  outcome?: "success" | "failure" | "info";
  metadata?: Record<string, unknown>;
};

function defaultOutcome(
  action: AuthAuditAction
): "success" | "failure" | "info" {
  if (action.endsWith("_failure")) return "failure";
  return "success";
}

// Audit logger. M5: the request-path portion (reading ip + user-agent from
// headers()) must happen inside the request scope — we do that synchronously
// and then hand the DB insert to Next.js `after()` so user-facing latency is
// not gated on a Supabase round-trip. `after()` runs on Vercel Fluid Compute
// after the response is sent, similar to waitUntil.
//
// M4: insert failures are logged loudly to stderr with a [AUTH_AUDIT_FAILURE]
// prefix so an alert pipeline (or a human reading logs during an incident)
// can detect a silently broken audit trail. Auth flows continue — the alternative
// (blocking login on a failing audit pipeline) is worse.
async function logAuthEvent(
  action: AuthAuditAction,
  opts: AuditOpts = {}
): Promise<void> {
  let ip: string = "unknown";
  let userAgent: string | null = null;
  try {
    ip = await getClientIp().catch(() => "unknown");
    const hdrs = await headers();
    const rawUa = hdrs.get("user-agent");
    userAgent = rawUa ? rawUa.slice(0, 512) : null;
  } catch {
    // headers() unavailable outside a request context — leave null.
  }

  const payload = {
    action,
    actor_id: opts.actorId ?? null,
    target_id: opts.targetId ?? null,
    target_email: opts.targetEmail ?? null,
    ip: ip && ip !== "unknown" ? ip : null,
    user_agent: userAgent,
    outcome: opts.outcome ?? defaultOutcome(action),
    metadata: { ...(opts.metadata ?? {}) },
  };

  const runInsert = async () => {
    try {
      const adminClient = createAdminClient();
      const { error } = await adminClient
        .from("auth_audit_log")
        .insert(payload);
      if (error) {
        console.error(
          "[AUTH_AUDIT_FAILURE] audit insert rejected",
          JSON.stringify({
            action,
            outcome: payload.outcome,
            target_email: payload.target_email,
            error: { message: error.message, code: error.code },
          })
        );
      }
    } catch (err) {
      console.error(
        "[AUTH_AUDIT_FAILURE] audit insert threw",
        JSON.stringify({
          action,
          outcome: payload.outcome,
          target_email: payload.target_email,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  };

  try {
    after(runInsert);
  } catch {
    // `after()` is only available inside a request scope. Outside of it
    // (e.g., tests) fall back to awaiting inline so the call isn't lost.
    await runInsert();
  }
}

// ── Check Invite Email (Step 1 of signup) ──────────────────────────────
export async function checkInviteEmail(formData: FormData) {
  const startedAt = Date.now();
  const rawEmail = (formData.get("email") as string) || "";
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    await padTiming(startedAt, SIGNUP_CHECK_MIN_MS);
    redirect(`/signup?error=${encodeURIComponent("Email is required.")}`);
  }

  // M2: cap on BOTH IP and email. Without the email cap, an attacker rotating
  // IPs (trivial with residential proxies) could enumerate invited_emails by
  // observing cookie presence / response timing — agency rosters on LinkedIn
  // make the @ad-lab.io mailbox namespace guessable.
  const ipOk = await rateLimitByIp("signup_check");
  const emailOk = await rateLimitByEmail("signup_check", email);
  if (!ipOk || !emailOk) {
    await padTiming(startedAt, SIGNUP_CHECK_MIN_MS);
    redirect(
      `/signup?error=${encodeURIComponent("Too many attempts. Please try again later.")}`
    );
  }

  // Obvious off-domain non-admin emails get the denied step. That's not an
  // enumeration leak because anyone could tell without contacting us — but we
  // still pad so off-domain and on-domain response times are indistinguishable.
  const isBootstrap = await canBootstrapAsAdmin(email);
  if (!email.endsWith("@ad-lab.io") && !isBootstrap) {
    await padTiming(startedAt, SIGNUP_CHECK_MIN_MS);
    redirect(`/signup?step=denied`);
  }

  try {
    const adminClient = createAdminClient();
    // invited_emails has a CHECK (email = lower(email)) constraint; lowercase at the query site is defensive.
    const { error } = await adminClient
      .from("invited_emails")
      .select("email")
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .maybeSingle();

    if (error) {
      await padTiming(startedAt, SIGNUP_CHECK_MIN_MS);
      redirect(
        `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
      );
    }

    // Enumeration mitigation: every valid-looking email reaches /signup?step=confirm
    // AND always receives the signup_pending_email cookie. Invite validity is
    // re-checked server-side in `signup()`; unauthorized emails fail opaquely
    // there with "Session expired". This keeps both timing and Set-Cookie
    // response headers constant across invited/not-invited.
    const cookieStore = await cookies();
    cookieStore.set("signup_pending_email", email, shortCookieOptions("/signup"));

    await padTiming(startedAt, SIGNUP_CHECK_MIN_MS);
    redirect(`/signup?step=confirm`);
  } catch (err) {
    unstable_rethrow(err);
    await padTiming(startedAt, SIGNUP_CHECK_MIN_MS);
    redirect(
      `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Sign Up ────────────────────────────────────────────────────────────
export async function signup(formData: FormData) {
  const cookieStore = await cookies();
  const email =
    cookieStore.get("signup_pending_email")?.value?.trim().toLowerCase() ?? "";
  const password = formData.get("password") as string;
  const rawFullName = (formData.get("full_name") as string) ?? "";
  const fullName = rawFullName.trim().slice(0, 100);

  if (!email) {
    redirect(
      `/signup?error=${encodeURIComponent("Session expired. Please start again.")}`
    );
  }

  const allowed = await rateLimitByIp("signup_submit");
  if (!allowed) {
    redirect(
      `/signup?error=${encodeURIComponent("Too many attempts. Please try again later.")}`
    );
  }

  if (!fullName) {
    redirect(
      `/signup?step=confirm&error=${encodeURIComponent("Please enter your full name.")}`
    );
  }

  const isBootstrap = await canBootstrapAsAdmin(email);
  if (!email.endsWith("@ad-lab.io") && !isBootstrap) {
    redirect(`/signup?step=denied`);
  }

  if (!password || password.length < 12) {
    redirect(
      `/signup?step=confirm&error=${encodeURIComponent("Password must be at least 12 characters.")}`
    );
  }

  // H6: full policy check — length alone is not enough. Runs before we create
  // the Supabase user so a policy rejection doesn't leave a half-provisioned
  // account around.
  const signupPolicy = await validatePassword(password, {
    email,
    fullName,
  });
  if (!signupPolicy.ok) {
    redirect(
      `/signup?step=confirm&error=${encodeURIComponent(
        signupPolicy.reason ?? "Password does not meet requirements."
      )}`
    );
  }

  try {
    const adminClient = createAdminClient();
    const { data: invite, error: inviteError } = await adminClient
      .from("invited_emails")
      .select("id, email, role, accepted_at")
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .maybeSingle();

    if (inviteError) {
      redirect(
        `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
      );
    }

    if (!invite && !isBootstrap) {
      // No invite AND not a seed admin — opaque session error (attacker can't
      // tell whether the email is invited without actually being invited).
      redirect(
        `/signup?error=${encodeURIComponent("Session expired. Please start again.")}`
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error || !data.user) {
      redirect(
        `/signup?step=confirm&error=${encodeURIComponent("Unable to create account. Please try again.")}`
      );
    }

    const desiredRole: "admin" | "member" = isBootstrap
      ? "admin"
      : invite?.role === "admin"
        ? "admin"
        : "member";

    // C3: close the bootstrap-admin race. Two concurrent signups by different
    // ADMIN_EMAILS entries both pass canBootstrapAsAdmin() at t=0. The atomic
    // RPC uses a pg_advisory_xact_lock + EXISTS check + metadata write inside
    // one transaction so only ONE call can promote. The loser falls back to
    // member role — they were still invited via ADMIN_EMAILS, so a member
    // account is a safe default rather than failing their signup.
    if (isBootstrap) {
      const { data: claimed, error: bootstrapErr } = await adminClient.rpc(
        "try_bootstrap_admin",
        { p_user_id: data.user.id }
      );
      if (bootstrapErr) {
        redirect(
          `/signup?step=confirm&error=${encodeURIComponent("Account setup failed. Please contact an admin.")}`
        );
      }
      if (claimed !== true) {
        // Lost the race. Fall back to member.
        const { error: fallbackErr } =
          await adminClient.auth.admin.updateUserById(data.user.id, {
            app_metadata: { role: "member" },
          });
        if (fallbackErr) {
          redirect(
            `/signup?step=confirm&error=${encodeURIComponent("Account setup failed. Please contact an admin.")}`
          );
        }
      }
    } else {
      // L4: Role assignment failure must NOT silently succeed the signup.
      const { error: roleErr } = await adminClient.auth.admin.updateUserById(
        data.user.id,
        { app_metadata: { role: desiredRole } }
      );
      if (roleErr) {
        redirect(
          `/signup?step=confirm&error=${encodeURIComponent("Account setup failed. Please contact an admin.")}`
        );
      }
    }

    if (invite) {
      // L5: accept_at failure is best-effort (user is created), but we log it
      // rather than swallowing silently.
      const { error: acceptErr } = await adminClient
        .from("invited_emails")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (acceptErr) {
        await logAuthEvent("user_invited", {
          actorId: data.user.id,
          targetEmail: email,
          metadata: {
            warning: "invite_accept_update_failed",
            invite_id: invite.id,
          },
        });
      }
    }

    cookieStore.delete("signup_pending_email");

    // M10: persist email for the verify step via HttpOnly cookie, not URL.
    cookieStore.set("pending_signup_email", email, shortCookieOptions("/"));

    redirect(`/auth/verify?type=signup`);
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Login with Password (step 1 of 2FA) ───────────────────────────────
export async function login(formData: FormData) {
  const startedAt = Date.now();
  const rawEmail = (formData.get("email") as string)?.trim().toLowerCase() ?? "";
  const password = (formData.get("password") as string) ?? "";

  if (!rawEmail || !password) {
    await padTiming(startedAt, LOGIN_MIN_MS);
    redirect(
      `/login?error=${encodeURIComponent("Please enter your email and password.")}`
    );
  }

  const ipEmailOk = await rateLimitByIpAndEmail("login", rawEmail);
  const emailOk = await rateLimitByEmail("login", rawEmail);
  if (!ipEmailOk || !emailOk) {
    await padTiming(startedAt, LOGIN_MIN_MS);
    redirect(
      `/login?error=${encodeURIComponent("Too many attempts. Please try again later.")}`
    );
  }

  const isBootstrap = await canBootstrapAsAdmin(rawEmail);
  if (!rawEmail.endsWith("@ad-lab.io") && !isBootstrap) {
    await padTiming(startedAt, LOGIN_MIN_MS);
    redirect(
      `/login?error=${encodeURIComponent("Invalid email or password.")}`
    );
  }

  try {
    const supabase = await createClient();
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: rawEmail,
        password,
      });

    if (signInError || !signInData?.user) {
      await logAuthEvent("login_failure", {
        actorId: null,
        targetEmail: rawEmail,
        metadata: { reason: "invalid_credentials" },
      });
      await padTiming(startedAt, LOGIN_MIN_MS);
      redirect(
        `/login?error=${encodeURIComponent("Invalid email or password.")}`
      );
    }

    const userId = signInData.user.id;

    // H8: Phantom-login pattern. Password is verified → immediately sign the
    // Supabase session out before it becomes reachable from protected routes.
    // Between here and /auth/verify there is NO auth-token cookie, so the 2FA
    // gate cannot be bypassed by letting pending_2fa expire while the session
    // lives on. verifyOtp mints a fresh session after OTP is verified.
    try {
      await supabase.auth.signOut();
    } catch {
      // Non-fatal — we still delete cookies below.
    }

    const cookieStore = await cookies();
    try {
      cookieStore
        .getAll()
        .filter((c) => isSupabaseAuthCookieName(c.name))
        .forEach((c) => cookieStore.delete(c.name));
    } catch {
      // Non-fatal.
    }

    // C1: Bind the 2FA gate to a server-side row keyed by user_id. The
    // cookie below is a UX cache; this row is truth.
    try {
      const adminClient = createAdminClient();
      const { error: pendingErr } = await adminClient.rpc(
        "auth_pending_2fa_set",
        { p_user_id: userId }
      );
      if (pendingErr) {
        await padTiming(startedAt, LOGIN_MIN_MS);
        redirect(
          `/login?error=${encodeURIComponent("Could not start sign-in. Please try again.")}`
        );
      }
    } catch (err) {
      unstable_rethrow(err);
      await padTiming(startedAt, LOGIN_MIN_MS);
      redirect(
        `/login?error=${encodeURIComponent("Could not start sign-in. Please try again.")}`
      );
    }

    // H3: pending_2fa HMAC binds userId AND email. Swapping the plaintext
    // pending_2fa_email cookie alone no longer redirects the OTP to a
    // different address — verification fails unless both match.
    cookieStore.set(
      "pending_2fa",
      signPending2faToken(userId, rawEmail),
      shortCookieOptions("/")
    );
    // M10: email comes from this cookie, not the URL, in verifyOtp/sendOtpCode.
    cookieStore.set("pending_2fa_email", rawEmail, shortCookieOptions("/"));

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: rawEmail,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      await padTiming(startedAt, LOGIN_MIN_MS);
      redirect(
        `/login?error=${encodeURIComponent("Could not send verification code. Please try again.")}`
      );
    }

    await logAuthEvent("login_success", {
      actorId: userId,
      targetEmail: rawEmail,
      metadata: { stage: "password_verified_awaiting_otp" },
    });

    await padTiming(startedAt, LOGIN_MIN_MS);
    redirect(`/auth/verify?type=magiclink`);
  } catch (err) {
    unstable_rethrow(err);
    await padTiming(startedAt, LOGIN_MIN_MS);
    redirect(
      `/login?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Send OTP Code (resend — returns state, does not redirect) ──────────
export async function sendOtpCode(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const flowType = ((formData.get("type") as string) || "magiclink").trim();

  // Resolve email from server-side state only. Never from form data.
  const cookieStore = await cookies();
  let email = "";
  if (flowType === "recovery") {
    email =
      cookieStore.get("pending_recovery_email")?.value?.trim().toLowerCase() ?? "";
  } else if (flowType === "signup") {
    email =
      cookieStore.get("pending_signup_email")?.value?.trim().toLowerCase() ?? "";
  } else {
    // magiclink / 2FA — requires pending_2fa cookie AND that the cookie's
    // signature binds the email we're about to send the OTP to. H3: refuse to
    // resend if pending_2fa_email has been swapped without re-signing pending_2fa.
    const pending2fa = cookieStore.get("pending_2fa")?.value;
    const cookieEmail =
      cookieStore.get("pending_2fa_email")?.value?.trim().toLowerCase() ?? "";
    if (!pending2fa || !cookieEmail) {
      return { message: "Too many attempts. Please try again later." };
    }
    if (!verifyPending2faToken(pending2fa, cookieEmail)) {
      return { message: "Too many attempts. Please try again later." };
    }
    email = cookieEmail;
  }

  if (!email) {
    return { message: "Too many attempts. Please try again later." };
  }

  const ipOk = await rateLimitByIpAndEmail("otp_request", email);
  const emailOk = await rateLimitByEmail("otp_request", email);
  if (!ipOk || !emailOk) {
    return { message: "Too many attempts. Please try again later." };
  }

  try {
    const supabase = await createClient();

    // Recovery resends must re-issue the password-reset email (same contract
    // as requestPasswordReset), not a magic link — otherwise the user lands
    // in a sign-in session instead of a recovery-verified one.
    const { error } =
      flowType === "recovery"
        ? await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
          })
        : await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
          });
    if (error) return { message: "Could not resend code. Please try again." };
    return { success: true, message: "A new code has been sent to your email." };
  } catch {
    return { message: "Something went wrong. Please try again." };
  }
}

// ── Verify OTP ─────────────────────────────────────────────────────────
export async function verifyOtp(formData: FormData) {
  const token = ((formData.get("token") as string) || "").trim();
  const type = ((formData.get("type") as string) || "magiclink").trim();
  const otpType: "signup" | "magiclink" | "recovery" =
    type === "signup" ? "signup" : type === "recovery" ? "recovery" : "magiclink";

  const cookieStore = await cookies();

  // M10: pull the target email from server state, not form data.
  let email = "";
  let boundUserId: string | null = null;
  if (otpType === "signup") {
    email =
      cookieStore.get("pending_signup_email")?.value?.trim().toLowerCase() ?? "";
  } else if (otpType === "recovery") {
    email =
      cookieStore.get("pending_recovery_email")?.value?.trim().toLowerCase() ?? "";
  } else {
    // magiclink: require pending_2fa cookie (set in login). If missing, the
    // user's 2FA window has lapsed — send them back to /login to redo the
    // password step (error message must be in the login page's allowlist).
    const pending2fa = cookieStore.get("pending_2fa")?.value;
    if (!pending2fa) {
      redirect(
        `/login?error=${encodeURIComponent("Your session has expired. Please sign in again.")}`
      );
    }
    const cookieEmail =
      cookieStore.get("pending_2fa_email")?.value?.trim().toLowerCase() ?? "";
    // H3: pending_2fa HMAC must bind to this email. If an attacker swapped
    // pending_2fa_email to a victim's address without resigning pending_2fa,
    // the binding check fails here before we send the OTP anywhere.
    boundUserId = verifyPending2faToken(pending2fa, cookieEmail);
    if (!boundUserId) {
      cookieStore.delete("pending_2fa");
      cookieStore.delete("pending_2fa_email");
      redirect(
        `/login?error=${encodeURIComponent("Your session has expired. Please sign in again.")}`
      );
    }
    email = cookieEmail;
  }

  if (!email) {
    // No pending flow state → route back to the correct entry point.
    const entry =
      otpType === "recovery"
        ? `/auth/forgot-password?error=${encodeURIComponent("Something went wrong. Please try again.")}`
        : `/login?error=${encodeURIComponent("Your session has expired. Please sign in again.")}`;
    redirect(entry);
  }

  if (!token) {
    redirect(
      `/auth/verify?type=${type}&error=${encodeURIComponent("Please enter the verification code.")}`
    );
  }

  // H10: cap verify attempts on BOTH (ip,email) AND email alone. Without the
  // email-only cap, an attacker rotating IPs could exhaust 10 verify attempts
  // per IP against the same victim email and brute-force the 8-digit code.
  const rlOk = await rateLimitByIpAndEmail("otp_verify", email);
  const rlEmailOk = await rateLimitByEmail("otp_verify", email);
  if (!rlOk || !rlEmailOk) {
    redirect(
      `/auth/verify?type=${type}&error=${encodeURIComponent("Too many attempts. Please try again later.")}`
    );
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: otpType,
    });

    if (error) {
      await logAuthEvent("otp_verify_failure", {
        actorId: null,
        targetEmail: email,
        metadata: { type: otpType },
      });
      redirect(
        `/auth/verify?type=${type}&error=${encodeURIComponent("Verification failed. Please try again.")}`
      );
    }

    if (otpType === "recovery") {
      // M4: cookie value is bound to user id via HMAC, not a flag.
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        redirect(
          `/auth/verify?type=${type}&error=${encodeURIComponent("Verification failed. Please try again.")}`
        );
      }
      // H4: also set server-side pending_recovery marker so middleware can
      // gate even if the recovery_verified cookie is deleted by a malicious
      // extension or lost to cookie-stuffing.
      try {
        const adminClient = createAdminClient();
        await adminClient.rpc("auth_pending_recovery_set", { p_user_id: uid });
      } catch {
        // Non-fatal — recovery_verified cookie is still the primary gate.
      }
      cookieStore.set(
        "recovery_verified",
        signRecoveryToken(uid),
        shortCookieOptions("/")
      );
      cookieStore.delete("pending_recovery_email");
      await logAuthEvent("otp_verify_success", {
        actorId: uid,
        targetEmail: email,
        metadata: { type: otpType },
      });
      redirect("/auth/reset-password");
    }

    if (otpType === "magiclink") {
      // C1/H6: clear the server-side pending-2fa row FIRST, then cookies.
      // If the DB clear fails we abort rather than leave a "verified session
      // + pending row" state that middleware would still gate out.
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        redirect(
          `/auth/verify?type=${type}&error=${encodeURIComponent("Verification failed. Please try again.")}`
        );
      }
      // H3 defense-in-depth: the newly-minted session's user id MUST match the
      // user id bound into the pending_2fa cookie. If they diverge, an
      // attacker-crafted cookie swap made it past the pre-verify check —
      // invalidate the session and abort.
      if (boundUserId && uid !== boundUserId) {
        try {
          await supabase.auth.signOut();
        } catch {
          // Non-fatal.
        }
        try {
          cookieStore
            .getAll()
            .filter((c) => isSupabaseAuthCookieName(c.name))
            .forEach((c) => cookieStore.delete(c.name));
        } catch {
          // Non-fatal.
        }
        cookieStore.delete("pending_2fa");
        cookieStore.delete("pending_2fa_email");
        await logAuthEvent("otp_verify_failure", {
          actorId: null,
          targetEmail: email,
          metadata: { type: otpType, reason: "cookie_binding_mismatch" },
        });
        redirect(
          `/login?error=${encodeURIComponent("Your session has expired. Please sign in again.")}`
        );
      }
      try {
        const adminClient = createAdminClient();
        const { error: clearErr } = await adminClient.rpc(
          "auth_pending_2fa_clear",
          { p_user_id: uid }
        );
        if (clearErr) {
          redirect(
            `/auth/verify?type=${type}&error=${encodeURIComponent("Verification failed. Please try again.")}`
          );
        }
      } catch (innerErr) {
        unstable_rethrow(innerErr);
        redirect(
          `/auth/verify?type=${type}&error=${encodeURIComponent("Verification failed. Please try again.")}`
        );
      }
      cookieStore.delete("pending_2fa");
      cookieStore.delete("pending_2fa_email");
      await logAuthEvent("otp_verify_success", {
        actorId: uid,
        targetEmail: email,
        metadata: { type: otpType },
      });
      redirect("/");
    }

    // signup
    cookieStore.delete("pending_signup_email");
    const { data: userData } = await supabase.auth.getUser();
    await logAuthEvent("otp_verify_success", {
      actorId: userData?.user?.id ?? null,
      targetEmail: email,
      metadata: { type: otpType },
    });
    redirect("/");
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/auth/verify?type=${type}&error=${encodeURIComponent("Verification failed. Please try again.")}`
    );
  }
}

// ── Request Password Reset ─────────────────────────────────────────────
export async function requestPasswordReset(formData: FormData) {
  const startedAt = Date.now();
  const rawEmail = (formData.get("email") as string)?.trim().toLowerCase() ?? "";

  if (!rawEmail) {
    await padTiming(startedAt, RESET_REQUEST_MIN_MS);
    redirect(
      `/auth/forgot-password?error=${encodeURIComponent("Email is required.")}`
    );
  }

  const ipOk = await rateLimitByIp("password_reset_request");
  const emailOk = await rateLimitByEmail("password_reset_request", rawEmail);
  if (!ipOk || !emailOk) {
    await padTiming(startedAt, RESET_REQUEST_MIN_MS);
    redirect(
      `/auth/forgot-password?error=${encodeURIComponent("Too many attempts. Please try again later.")}`
    );
  }

  const isBootstrap = await canBootstrapAsAdmin(rawEmail);
  // H1: always route both branches through an equivalent path. Off-domain
  // emails used to return instantly while @ad-lab.io emails made an HTTP
  // round-trip, making response latency a trivial enumeration oracle. Now we
  // always redirect to /auth/verify?type=recovery after padding — the
  // attacker cannot distinguish "email exists and mail sent" from "email is
  // off-domain / non-existent and we silently dropped it".
  if (!rawEmail.endsWith("@ad-lab.io") && !isBootstrap) {
    await padTiming(startedAt, RESET_REQUEST_MIN_MS);
    const cookieStore = await cookies();
    cookieStore.set("pending_recovery_email", rawEmail, shortCookieOptions("/"));
    redirect(`/auth/verify?type=recovery`);
  }

  try {
    const supabase = await createClient();
    // Contract with the Supabase "Reset Password" email template:
    //   - `{{ .Token }}` must be rendered so users can enter the 8-digit OTP
    //     at /auth/verify?type=recovery (handled by verifyOtp).
    //   - `{{ .ConfirmationURL }}` is ALSO supported as a fallback; clicks
    //     hit /auth/callback, which mints `recovery_verified` and redirects
    //     to /auth/reset-password.
    // Both paths must stay wired; the verify UI surfaces both options so the
    // flow doesn't silently drift if a template only renders one.
    const { error } = await supabase.auth.resetPasswordForEmail(rawEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      await padTiming(startedAt, RESET_REQUEST_MIN_MS);
      redirect(
        `/auth/forgot-password?error=${encodeURIComponent("Could not send reset code. Please try again.")}`
      );
    }

    // M10: persist email in HttpOnly cookie for verify/resend steps.
    const cookieStore = await cookies();
    cookieStore.set("pending_recovery_email", rawEmail, shortCookieOptions("/"));

    await logAuthEvent("password_reset_requested", {
      actorId: null,
      targetEmail: rawEmail,
    });

    await padTiming(startedAt, RESET_REQUEST_MIN_MS);
    redirect(`/auth/verify?type=recovery`);
  } catch (err) {
    unstable_rethrow(err);
    await padTiming(startedAt, RESET_REQUEST_MIN_MS);
    redirect(
      `/auth/forgot-password?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Update Password (after OTP verification) ───────────────────────────
export async function updatePassword(formData: FormData) {
  const password = (formData.get("password") as string) ?? "";
  const confirmPassword = (formData.get("confirm_password") as string) ?? "";

  const cookieStore = await cookies();

  const allowed = await rateLimitByIp("password_update");
  if (!allowed) {
    // Rate-limit hit is a hard failure — clear recovery state. A sustained
    // hammer from one IP doesn't deserve retry window.
    cookieStore.delete("recovery_verified");
    try {
      const supabase = await createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const adminClient = createAdminClient();
        await adminClient.rpc("auth_pending_recovery_clear", {
          p_user_id: userData.user.id,
        });
      }
    } catch {
      // Non-fatal.
    }
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Too many attempts. Please try again later.")}`
    );
  }

  try {
    const supabase = await createClient();

    // C1/C2: confirm recovery flow AND bind cookie to this user id. Resolve
    // the user BEFORE running password-policy checks so validation failures
    // don't burn the recovery cycle — user keeps the session and can retry
    // with a different password. (H5)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const user = userData?.user;
    const recoveryCookie = cookieStore.get("recovery_verified")?.value;
    if (userErr || !user || !verifyRecoveryToken(recoveryCookie, user.id)) {
      cookieStore.delete("recovery_verified");
      redirect(
        `/auth/reset-password?error=${encodeURIComponent("Session expired. Please request a new reset link.")}`
      );
    }

    // H5: password-validation failures MUST NOT delete recovery_verified.
    // Legitimate users who hit the policy (mismatch, length, HIBP, etc.)
    // should be able to retry without restarting the whole reset flow.
    if (password !== confirmPassword) {
      redirect(
        `/auth/reset-password?error=${encodeURIComponent("Passwords do not match.")}`
      );
    }

    const meta = (user.user_metadata ?? {}) as { full_name?: string | null };
    const policy = await validatePassword(password, {
      email: user.email ?? null,
      fullName: meta.full_name ?? null,
    });
    if (!policy.ok) {
      redirect(
        `/auth/reset-password?error=${encodeURIComponent(
          policy.reason ?? "Password does not meet requirements."
        )}`
      );
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      // H5: Supabase rejection (e.g., built-in pwned check if enabled) is
      // treated as a retryable validation error — don't kill recovery_verified.
      redirect(
        `/auth/reset-password?error=${encodeURIComponent("Password update failed. Please try again.")}`
      );
    }

    // C2: kill EVERY active session for this user (attacker + legitimate)
    // by calling admin.signOut with "global". Then sign out locally and
    // clear the recovery cookie AND the server-side pending_recovery row.
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.signOut(user.id, "global");
      await adminClient.rpc("auth_pending_recovery_clear", {
        p_user_id: user.id,
      });
    } catch {
      // Non-fatal — best-effort global invalidation.
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Non-fatal — cookies get cleared below regardless.
    }

    cookieStore.delete("recovery_verified");

    // Also clear any lingering supabase auth cookies so the client returns
    // to /login fully unauthenticated.
    try {
      cookieStore
        .getAll()
        .filter((c) => isSupabaseAuthCookieName(c.name))
        .forEach((c) => cookieStore.delete(c.name));
    } catch {
      // Non-fatal.
    }

    await logAuthEvent("password_changed", {
      actorId: user.id,
      targetId: user.id,
      targetEmail: user.email ?? null,
    });

    redirect(
      `/login?message=${encodeURIComponent("Password updated. Please sign in.")}`
    );
  } catch (err) {
    unstable_rethrow(err);
    // Unexpected throw is a hard failure — clear state so the user restarts.
    cookieStore.delete("recovery_verified");
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Logout ─────────────────────────────────────────────────────────────
export async function logout() {
  const cookieStore = await cookies();

  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    // Capture identity for audit before we destroy the session.
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
      userEmail = data?.user?.email ?? null;
    } catch {
      // Non-fatal.
    }
    // C1 / H4: best-effort clear of the server-side pending_2fa AND
    // pending_recovery rows so a re-login starts clean.
    if (userId) {
      try {
        const adminClient = createAdminClient();
        await adminClient.rpc("auth_pending_2fa_clear", { p_user_id: userId });
        await adminClient.rpc("auth_pending_recovery_clear", {
          p_user_id: userId,
        });
      } catch {
        // Non-fatal.
      }
    }

    // M3: kill sessions everywhere, not just this device.
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // signOut failed — fall through to cookie clearing below
  }

  // Always clear auth cookies regardless of whether signOut() succeeded.
  try {
    cookieStore
      .getAll()
      .filter((c) => isSupabaseAuthCookieName(c.name))
      .forEach((c) => cookieStore.delete(c.name));
  } catch {
    // Non-fatal if cookie iteration fails.
  }

  // Also clear any in-flight auth flow cookies.
  cookieStore.delete("pending_2fa");
  cookieStore.delete("pending_2fa_email");
  cookieStore.delete("pending_signup_email");
  cookieStore.delete("pending_recovery_email");
  cookieStore.delete("recovery_verified");

  if (userId || userEmail) {
    await logAuthEvent("logout", {
      actorId: userId,
      targetId: userId,
      targetEmail: userEmail,
    });
  }

  redirect("/login");
}

// ── Invite User (admin only) ───────────────────────────────────────────
export async function inviteUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();
  if (!isAdmin(user)) {
    return { message: "Admin access required." };
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const rawRole = (formData.get("role") as string | null)?.trim();
  const role: "admin" | "member" = rawRole === "admin" ? "admin" : "member";

  if (!email) {
    return { message: "Email is required." };
  }

  if (!email.endsWith("@ad-lab.io")) {
    return { message: "Only @ad-lab.io email addresses are allowed." };
  }

  try {
    const adminClient = createAdminClient();

    // M8: single RPC call replaces the paginated listUsers loop.
    const { data: exists, error: existsErr } = await adminClient.rpc(
      "auth_user_exists_by_email",
      { p_email: email }
    );
    if (existsErr) {
      return { message: "Failed to check account. Please try again." };
    }
    if (exists === true) {
      return { message: `${email} already has an account.` };
    }

    // C4: refuse to upsert over an invite that was previously accepted.
    // Trigger 037 deletes invited_emails rows on auth.users delete, so a
    // surviving accepted row here means either (a) the trigger failed, or
    // (b) the row was manually inserted. Either way, require a manual reset
    // before re-inviting — a silent "accepted_at: null" flip reopens /signup
    // for an ex-employee's email.
    const { data: existing, error: existingErr } = await adminClient
      .from("invited_emails")
      .select("id, accepted_at")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (existingErr) {
      return { message: "Failed to check existing invite. Please try again." };
    }
    if (existing?.accepted_at) {
      return {
        message:
          "This email was previously invited and accepted. Contact an admin to reset before re-inviting.",
      };
    }

    const { error } = await adminClient.from("invited_emails").upsert(
      {
        email: email.toLowerCase(),
        role,
        invited_by_user_id: user.id,
        invited_at: new Date().toISOString(),
        accepted_at: null,
      },
      { onConflict: "email" }
    );

    if (error) {
      return { message: "Failed to record invite. Please try again." };
    }

    // M3: no invite email is sent from this action. Record that fact in the
    // audit log so "invited" vs "notified" are distinguishable during
    // forensics. The UI copy below makes the manual-notification requirement
    // explicit to the inviting admin.
    await logAuthEvent("user_invited", {
      actorId: user.id,
      targetEmail: email,
      metadata: { role, auto_notified: false, notification_channel: "manual" },
    });

    return {
      success: true,
      message: `Invite recorded for ${email}. No email was sent — you must notify them manually (Slack/email) with the /signup link.`,
    };
  } catch {
    return { message: "Failed to send invitation. Check your configuration." };
  }
}

// ── Set User Role (admin only) ─────────────────────────────────────────
export async function setUserRole(
  userId: string,
  role: "admin" | "member"
): Promise<ActionState> {
  const currentUser = await getAuthenticatedUser();
  if (!isAdmin(currentUser)) {
    return { message: "Admin access required." };
  }

  if (userId === currentUser.id) {
    return { message: "You cannot change your own role." };
  }

  if (role !== "admin" && role !== "member") {
    return { message: "Invalid role." };
  }

  try {
    const adminClient = createAdminClient();

    // C2: prevent demoting the last admin. If that admin quits / gets
    // compromised-and-deleted, recovery via ADMIN_EMAILS is blocked for an
    // ex-admin whose email already exists in auth.users. Refuse the demotion.
    if (role === "member") {
      const { data: targetData, error: targetErr } =
        await adminClient.auth.admin.getUserById(userId);
      if (targetErr || !targetData?.user) {
        return { message: "Failed to look up user. Please try again." };
      }
      const currentRole =
        (targetData.user.app_metadata as { role?: string } | null)?.role ??
        "member";
      if (currentRole === "admin") {
        const { data: adminCount, error: countErr } = await adminClient.rpc(
          "auth_count_admins"
        );
        if (countErr) {
          return {
            message: "Failed to verify admin count. Please try again.",
          };
        }
        if ((adminCount ?? 0) <= 1) {
          return {
            message:
              "Cannot demote the last admin. Promote another user first.",
          };
        }
      }
    }

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });

    if (error) {
      return { message: "Failed to update role. Please try again." };
    }

    // M1: force a fresh JWT by killing the target's active sessions
    // everywhere. The user must re-authenticate, which picks up the new role.
    try {
      await adminClient.auth.admin.signOut(userId, "global");
    } catch {
      // Non-fatal — role is updated; the stale JWT will expire on its own.
    }

    revalidatePath("/settings/team");

    await logAuthEvent("role_change", {
      actorId: currentUser.id,
      targetId: userId,
      metadata: { new_role: role },
    });

    return {
      success: true,
      message: role === "admin" ? "Promoted to admin." : "Demoted to member.",
    };
  } catch {
    return { message: "Failed to update role." };
  }
}

// ── Change Password (while logged in) ──────────────────────────────────
export async function changePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getAuthenticatedUser();

  const allowed = await rateLimitByIp("password_update");
  if (!allowed) {
    return { message: "Too many attempts. Please try again later." };
  }

  const currentPassword = (formData.get("current_password") as string) ?? "";
  const newPassword = (formData.get("new_password") as string) ?? "";
  const confirmPassword = (formData.get("confirm_password") as string) ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { message: "All fields are required." };
  }

  if (newPassword !== confirmPassword) {
    return { message: "New passwords do not match." };
  }

  if (newPassword === currentPassword) {
    return { message: "New password must be different from current password." };
  }

  try {
    const meta = (user.user_metadata ?? {}) as { full_name?: string | null };
    const policy = await validatePassword(newPassword, {
      email: user.email ?? null,
      fullName: meta.full_name ?? null,
    });
    if (!policy.ok) {
      return { message: policy.reason ?? "Password does not meet requirements." };
    }

    const supabase = await createClient();

    // Verify current password. signInWithPassword rotates the session, but the
    // user remains authenticated — acceptable side effect for re-auth.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (reauthError) {
      await logAuthEvent("login_failure", {
        actorId: user.id,
        targetEmail: user.email,
        metadata: { stage: "change_password_current_check" },
      });
      return { message: "Current password is incorrect." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { message: "Could not update password. Please try again." };
    }

    // Rotate other sessions but keep current alive — the user who just
    // changed their password shouldn't be kicked out of this tab.
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.signOut(user.id, "others");
    } catch {
      // Non-fatal.
    }

    await logAuthEvent("password_changed", {
      actorId: user.id,
      targetId: user.id,
      targetEmail: user.email,
    });

    return { success: true, message: "Password updated." };
  } catch (err) {
    unstable_rethrow(err);
    return { message: "Something went wrong. Please try again." };
  }
}
