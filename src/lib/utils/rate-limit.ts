import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitAction =
  | "login"
  | "signup_check"
  | "signup_submit"
  | "otp_request"
  | "otp_verify"
  | "password_reset_request"
  | "password_update"
  | "recovery_callback";

type Limit = { maxAttempts: number; windowSeconds: number };

const LIMITS: Record<RateLimitAction, Limit> = {
  login: { maxAttempts: 5, windowSeconds: 15 * 60 },
  signup_check: { maxAttempts: 10, windowSeconds: 60 * 60 },
  signup_submit: { maxAttempts: 5, windowSeconds: 60 * 60 },
  otp_request: { maxAttempts: 5, windowSeconds: 15 * 60 },
  otp_verify: { maxAttempts: 10, windowSeconds: 15 * 60 },
  password_reset_request: { maxAttempts: 3, windowSeconds: 60 * 60 },
  password_update: { maxAttempts: 5, windowSeconds: 15 * 60 },
  // Guard the /auth/callback entrypoint used by recovery magic-links. Separate
  // bucket so that a phishing attacker with a stolen reset code cannot hammer
  // the callback endpoint to resolve a session.
  recovery_callback: { maxAttempts: 10, windowSeconds: 15 * 60 },
};

// Derive the best-effort client IP from the request. Next.js server actions
// expose request headers via next/headers.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// Check a rate limit. Returns true when allowed.
//
// Keys compose IP + action so stolen-credentials attacks from one address are
// capped independently of other legitimate users. For email-targeted limits
// (password reset, OTP request), pass email as an additional component so a
// single attacker cannot flood a victim's inbox by rotating IPs.
async function check(
  action: RateLimitAction,
  components: string[]
): Promise<boolean> {
  const { maxAttempts, windowSeconds } = LIMITS[action];
  const key = components.join("|");
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("auth_rate_limit_check", {
      p_key: key,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // C5: fail CLOSED on infrastructure errors. This layer guards password
      // / OTP brute-force and signup flooding; silently allowing unlimited
      // attempts during a Supabase incident defeats the control at exactly
      // the moment you need it. Auth is degraded during an outage anyway —
      // fail-closed mirrors that rather than opening a window.
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

// M6: every component is namespaced so an IP that happens to look like an
// email (or vice versa) cannot collide across buckets. `ip:` and `email:`
// prefixes are reserved — keep in sync if new keying dimensions are added.
export async function rateLimitByIp(
  action: RateLimitAction
): Promise<boolean> {
  const ip = await getClientIp();
  return check(action, [`ip:${ip}`]);
}

export async function rateLimitByIpAndEmail(
  action: RateLimitAction,
  email: string
): Promise<boolean> {
  const ip = await getClientIp();
  const normalized = email.trim().toLowerCase();
  return check(action, [`ip:${ip}`, `email:${normalized}`]);
}

export async function rateLimitByEmail(
  action: RateLimitAction,
  email: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  return check(action, [`email:${normalized}`]);
}
