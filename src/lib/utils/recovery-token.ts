import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Dedicated cookie-signing secret. MUST be separate from SUPABASE_SERVICE_ROLE_KEY
// so rotating the DB service-role key does not invalidate in-flight recovery /
// 2FA cookies mid-flow, and so a leaked service-role key does not also leak
// the cookie-integrity secret (separation of duty).
//
// Required in every environment — dev AND prod. Evaluated lazily on first
// use so `next build`'s static page-data collection (which runs without
// runtime env vars) doesn't throw; the first real request at runtime will
// hard-fail if the secret is missing or short, with no silent fallback.
// Contributors must set AUTH_COOKIE_SECRET in .env.local (32+ chars).
let _cachedSecret: string | undefined;

function resolveAuthCookieSecret(): string {
  if (_cachedSecret !== undefined) return _cachedSecret;
  const value = process.env.AUTH_COOKIE_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_COOKIE_SECRET is required and must be at least 32 characters. Generate one with `openssl rand -hex 32` and add it to .env.local (dev) or your host's env (prod)."
    );
  }
  _cachedSecret = value;
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
