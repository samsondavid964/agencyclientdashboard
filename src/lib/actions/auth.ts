"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";

type ActionState = {
  message?: string;
  success?: boolean;
} | null;

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

// ── Check Invite Email (Step 1 of signup) ──────────────────────────────
export async function checkInviteEmail(formData: FormData) {
  const rawEmail = (formData.get("email") as string) || "";
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    redirect(
      `/signup?error=${encodeURIComponent("Email is required.")}`
    );
  }

  // Why: domain gate must apply here too, before we confirm the invite step,
  // so a non-@ad-lab.io address can't progress past /signup even if somehow
  // inserted into invited_emails. ADMIN_EMAILS seeds can bypass for bootstrap.
  if (!email.endsWith("@ad-lab.io") && !isAdminEmail(email)) {
    redirect(`/signup?step=denied`);
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("invited_emails")
      .select("email")
      .eq("email", email)
      .is("accepted_at", null)
      .maybeSingle();

    if (error) {
      redirect(
        `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
      );
    }

    // Allowlist miss, but the email may be a bootstrap seed admin.
    // Why: before any admin exists, no invite rows can be created; ADMIN_EMAILS
    // lets the first admin self-register without an invite.
    if (!data && !isAdminEmail(email)) {
      redirect(`/signup?step=denied`);
    }

    redirect(
      `/signup?step=confirm&email=${encodeURIComponent(email)}`
    );
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Sign Up ────────────────────────────────────────────────────────────
export async function signup(formData: FormData) {
  const rawEmail = (formData.get("email") as string) || "";
  const email = rawEmail.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  if (!email) {
    redirect(
      `/signup?error=${encodeURIComponent("Email is required.")}`
    );
  }

  // Why: enforce the @ad-lab.io domain gate at signup itself (same rule as
  // inviteUser) so this action can't be invoked directly with a non-company
  // address. ADMIN_EMAILS seed admins may use any domain for bootstrap.
  if (!email.endsWith("@ad-lab.io") && !isAdminEmail(email)) {
    redirect(`/signup?step=denied`);
  }

  try {
    // Look up the invite row first; allowlist supersedes the domain gate.
    const adminClient = createAdminClient();
    const { data: invite, error: inviteError } = await adminClient
      .from("invited_emails")
      .select("id, email, role, accepted_at")
      .eq("email", email)
      .is("accepted_at", null)
      .maybeSingle();

    if (inviteError) {
      redirect(
        `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
      );
    }

    const isSeedAdmin = !invite && isAdminEmail(email);

    if (!invite && !isSeedAdmin) {
      redirect(`/signup?step=denied`);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      redirect(
        `/signup?step=confirm&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`
      );
    }

    // Set role in app_metadata via admin client.
    // Seed admins (ADMIN_EMAILS) always get admin; invited users inherit the invite row's role.
    if (data.user) {
      const role: "admin" | "member" = isSeedAdmin
        ? "admin"
        : invite?.role === "admin"
          ? "admin"
          : "member";
      try {
        await adminClient.auth.admin.updateUserById(data.user.id, {
          app_metadata: { role },
        });
      } catch {
        // Non-fatal: role will default to member if admin client fails
      }
    }

    // Mark the invite as accepted so it cannot be reused.
    if (invite) {
      try {
        await adminClient
          .from("invited_emails")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invite.id);
      } catch {
        // Non-fatal: worst case the invite remains pending; user is already created.
      }
    }

    redirect(
      `/auth/verify?email=${encodeURIComponent(email)}&type=signup`
    );
  } catch (err) {
    // Re-throw Next.js control-flow errors (redirect / notFound) so they
    // aren't swallowed by our generic catch.
    unstable_rethrow(err);
    redirect(
      `/signup?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Login with Password ────────────────────────────────────────────────
export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/");
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/login?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Request OTP Sign-In (passwordless) ─────────────────────────────────
export async function requestOtpSignIn(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    redirect(`/login?error=${encodeURIComponent("Email is required.")}`);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect(
      `/auth/verify?email=${encodeURIComponent(email)}&type=magiclink`
    );
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/login?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Verify OTP ─────────────────────────────────────────────────────────
export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  const type = formData.get("type") as string;

  if (!email || !token) {
    redirect(
      `/auth/verify?email=${encodeURIComponent(email || "")}&type=${type}&error=${encodeURIComponent("Please enter the verification code.")}`
    );
  }

  try {
    const supabase = await createClient();
    const otpType = type === "signup" ? "signup" : type === "recovery" ? "recovery" : "magiclink";

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: otpType as "signup" | "magiclink" | "recovery",
    });

    if (error) {
      redirect(
        `/auth/verify?email=${encodeURIComponent(email)}&type=${type}&error=${encodeURIComponent(error.message)}`
      );
    }

    if (type === "recovery") {
      redirect("/auth/reset-password");
    }

    redirect("/");
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/auth/verify?email=${encodeURIComponent(email)}&type=${type}&error=${encodeURIComponent("Verification failed. Please try again.")}`
    );
  }
}

// ── Request Password Reset ─────────────────────────────────────────────
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    redirect(
      `/auth/forgot-password?error=${encodeURIComponent("Email is required.")}`
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      redirect(
        `/auth/forgot-password?error=${encodeURIComponent(error.message)}`
      );
    }

    redirect(
      `/auth/verify?email=${encodeURIComponent(email)}&type=recovery`
    );
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/auth/forgot-password?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Update Password (after OTP verification) ───────────────────────────
export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!password || password.length < 6) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Passwords do not match.")}`
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      redirect(
        `/auth/reset-password?error=${encodeURIComponent(error.message)}`
      );
    }

    redirect(
      `/login?message=${encodeURIComponent("Password updated successfully. Sign in with your new password.")}`
    );
  } catch (err) {
    unstable_rethrow(err);
    redirect(
      `/auth/reset-password?error=${encodeURIComponent("Something went wrong. Please try again.")}`
    );
  }
}

// ── Logout ─────────────────────────────────────────────────────────────
export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Sign out even if Supabase call fails
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

    // Reject if an auth user already exists for this email.
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    if (existingUsers?.users?.some((u) => u.email?.toLowerCase() === email)) {
      return { message: `${email} already has an account.` };
    }

    const { error } = await adminClient
      .from("invited_emails")
      .upsert(
        {
          email,
          role,
          invited_by_user_id: user.id,
          invited_at: new Date().toISOString(),
          accepted_at: null,
        },
        { onConflict: "email" }
      );

    if (error) {
      return { message: `Failed to record invite: ${error.message}` };
    }

    return {
      success: true,
      message: `${email} can now sign up at /signup.`,
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
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });

    if (error) {
      return { message: error.message };
    }

    revalidatePath("/settings/team");

    return {
      success: true,
      message: role === "admin" ? "Promoted to admin." : "Demoted to member.",
    };
  } catch {
    return { message: "Failed to update role." };
  }
}
