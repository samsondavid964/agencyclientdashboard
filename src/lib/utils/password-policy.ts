import "server-only";
import { createHash } from "node:crypto";

type PasswordContext = {
  email?: string | null;
  fullName?: string | null;
};

type ValidationResult = { ok: boolean; reason?: string };

const COMMON_PASSWORDS: ReadonlyArray<string> = [
  "password1234",
  "passwordpassword",
  "qwertyuiopas",
  "aaaaaaaaaaaa",
  "letmeinletmein",
  "administrator",
  "welcome12345",
  "1234567890ab",
  "abcd1234abcd",
  "changeme1234",
  "ad-labad-lab",
  "adminadminad",
  "qwerty123456",
  "iloveyouiloveyou",
  "football1234",
  "baseball1234",
  "monkey123456",
  "sunshine1234",
  "mustang12345",
  "trustno11234",
  "shadow123456",
  "dragon123456",
];

const COMMON_PASSWORDS_SET: ReadonlySet<string> = new Set(
  COMMON_PASSWORDS.map((p) => p.toLowerCase()),
);

function countCharClasses(password: string): number {
  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^A-Za-z0-9\s]/.test(password)) classes++;
  return classes;
}

function isSingleRepeatedChar(password: string): boolean {
  if (password.length === 0) return false;
  const first = password[0];
  for (let i = 1; i < password.length; i++) {
    if (password[i] !== first) return false;
  }
  return true;
}

async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1")
      .update(password, "utf8")
      .digest("hex")
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        method: "GET",
        headers: {
          // Add-Padding returns dummy entries so response size does not leak the hit count
          "Add-Padding": "true",
          "User-Agent": "AdLabDashboard",
        },
        signal: AbortSignal.timeout(1500),
      },
    );

    if (!res.ok) return false;
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const [lineSuffix, countStr] = line.split(":");
      if (!lineSuffix || !countStr) continue;
      if (lineSuffix.trim().toUpperCase() === suffix) {
        const count = parseInt(countStr.trim(), 10);
        if (Number.isFinite(count) && count > 0) return true;
      }
    }
    return false;
  } catch (err) {
    // Fail-open on HIBP outages so a third-party downtime does not lock legitimate users out of password changes
    console.warn("[password-policy] HIBP lookup failed, failing open:", err);
    return false;
  }
}

export async function validatePassword(
  password: string,
  context?: PasswordContext,
): Promise<ValidationResult> {
  if (password.length < 12) {
    return { ok: false, reason: "Password must be at least 12 characters." };
  }

  if (password.length > 128) {
    return { ok: false, reason: "Password is too long." };
  }

  if (countCharClasses(password) < 3) {
    return {
      ok: false,
      reason:
        "Password must include a mix of upper, lower, digits, and symbols.",
    };
  }

  const lowerPassword = password.toLowerCase();

  if (COMMON_PASSWORDS_SET.has(lowerPassword)) {
    return {
      ok: false,
      reason: "This password is too common. Please choose another.",
    };
  }

  const email = context?.email;
  if (email) {
    const atIdx = email.indexOf("@");
    const localPart = (atIdx > 0 ? email.slice(0, atIdx) : email)
      .trim()
      .toLowerCase();
    if (localPart.length >= 4 && lowerPassword.includes(localPart)) {
      return {
        ok: false,
        reason: "Password cannot include your email address.",
      };
    }
  }

  const fullName = context?.fullName;
  if (fullName) {
    const normalizedName = fullName.replace(/\s+/g, "").toLowerCase();
    if (normalizedName.length >= 4 && lowerPassword.includes(normalizedName)) {
      return { ok: false, reason: "Password cannot include your name." };
    }
  }

  if (isSingleRepeatedChar(password)) {
    return {
      ok: false,
      reason: "Password cannot be a single repeated character.",
    };
  }

  if (await isPwnedPassword(password)) {
    return {
      ok: false,
      reason:
        "This password has appeared in known data breaches. Please choose another.",
    };
  }

  return { ok: true };
}
