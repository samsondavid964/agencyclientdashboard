import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Dedicated cookie-signing secret. MUST be separate from SUPABASE_SERVICE_ROLE_KEY
// so rotating the DB service-role key does not invalidate in-flight recovery /
// 2FA cookies mid-flow, and so a leaked service-role key does not also leak
// the cookie-integrity secret (separation of duty).
//
// Production: fail-closed if unset — evaluated lazily on first use so
// `next build`'s static page-data collection (which runs without runtime env
// vars) doesn't throw. The first real request at runtime will still fail
// closed. Dev/CI: one-time loud warning + fixed fallback so local flows work
// without every contributor populating the env var.
let _cachedSecret: string | undefined;
let _devWarned = false;

function resolveAuthCookieSecret(): string {
  if (_cachedSecret !== undefined) return _cachedSecret;
  const value = process.env.AUTH_COOKIE_SECRET;
  if (value && value.length >= 32) {
    _cachedSecret = value;
    return _cachedSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_COOKIE_SECRET is required in production and must be at least 32 characters. Generate one with `openssl rand -hex 32`."
    );
  }
  if (!_devWarned) {
    _devWarned = true;
    console.warn(
      "[AUTH_COOKIE_SECRET] Missing or too short — using insecure dev fallback. Set AUTH_COOKIE_SECRET in .env.local (32+ chars) before shipping."
    );
  }
  _cachedSecret = "dev-only-insecure-auth-cookie-secret-do-not-use-in-prod";
  return _cachedSecret;
}

function recoverySecret(): string {
  return resolveAuthCookieSecret();
}

// Sign a cookie value bound to a user id. Verification must match both the
// userId and the signature exactly; replay to a different account fails.
export function signRecoveryToken(userId: string): string {
  const secret = recoverySecret();
  if (!secret) return userId;
  const h = createHmac("sha256", secret).update(userId).digest("hex");
  return `${userId}.${h}`;
}

export function verifyRecoveryToken(
  token: string | undefined,
  userId: string
): boolean {
  if (!token) return false;
  const secret = recoverySecret();
  if (!secret) return false;
  const [rawUserId, sig] = token.split(".");
  if (!rawUserId || !sig) return false;
  if (rawUserId !== userId) return false;
  const expected = createHmac("sha256", secret).update(userId).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  let actualBuf: Buffer;
  try {
    actualBuf = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}

// Sign a pending-2FA cookie bound to BOTH user id and the normalized email.
// The pending_2fa_email cookie is plaintext; binding email into the HMAC means
// swapping that cookie alone (malicious extension, physical access) no longer
// redirects the OTP to a different address without also forging the pending_2fa
// signature, which requires the server secret.
export function signPending2faToken(userId: string, email: string): string {
  const secret = recoverySecret();
  if (!secret) return userId;
  const normalized = email.trim().toLowerCase();
  const payload = `${userId}:${normalized}`;
  const h = createHmac("sha256", secret).update(payload).digest("hex");
  return `${userId}.${h}`;
}

// Verify a pending_2fa token against a userId+email pair. Returns the userId
// on success, null on any failure — callers should use the returned userId
// rather than one parsed from elsewhere.
export function verifyPending2faToken(
  token: string | undefined,
  email: string
): string | null {
  if (!token) return null;
  const secret = recoverySecret();
  if (!secret) return null;
  const [rawUserId, sig] = token.split(".");
  if (!rawUserId || !sig) return null;
  const normalized = email.trim().toLowerCase();
  const expected = createHmac("sha256", secret)
    .update(`${rawUserId}:${normalized}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  let actualBuf: Buffer;
  try {
    actualBuf = Buffer.from(sig, "hex");
  } catch {
    return null;
  }
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null;
  return rawUserId;
}
