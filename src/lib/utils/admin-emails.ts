import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_DOMAIN = "@ad-lab.io";

// Parse ADMIN_EMAILS once per process. Anything that doesn't end in the
// allowed domain is dropped — a misconfigured env var must never create an
// off-domain admin path. If the operator set ADMIN_EMAILS but everything in
// it was dropped, fail closed at boot: a silent empty list would disable the
// seed-admin bootstrap without any signal.
function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const all = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  const allowed = all.filter((e) => e.endsWith(ALLOWED_DOMAIN));
  if (allowed.length !== all.length) {
    const dropped = all.filter((e) => !e.endsWith(ALLOWED_DOMAIN));
    console.error(
      `[ADMIN_EMAILS_CONFIG] Dropped ${dropped.length} entry/entries outside ${ALLOWED_DOMAIN} from ADMIN_EMAILS: ${JSON.stringify(dropped)}`
    );
  }
  if (all.length > 0 && allowed.length === 0) {
    throw new Error(
      `[ADMIN_EMAILS_CONFIG] ADMIN_EMAILS is set but contains no entries ending in ${ALLOWED_DOMAIN}. Refusing to boot with an empty admin bootstrap list.`
    );
  }
  return allowed;
}

// Lazy: `next build` collects page data without runtime env vars, so eager
// module-level parsing would throw spuriously in builds where ADMIN_EMAILS is
// legitimately deferred to runtime env wiring. First real call triggers
// parsing — and therefore the fail-closed path — on the running server.
let _cachedAdminEmails: string[] | undefined;

function getAdminEmails(): string[] {
  if (_cachedAdminEmails === undefined) {
    _cachedAdminEmails = parseAdminEmails();
  }
  return _cachedAdminEmails;
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}

// Seed-admin gate. Returns true only when:
//   1. The email is listed in ADMIN_EMAILS, AND
//   2. No user currently has app_metadata.role = 'admin'.
// After the first admin exists, ADMIN_EMAILS has no effect — subsequent admins
// must be provisioned via the invite flow.
export async function canBootstrapAsAdmin(email: string): Promise<boolean> {
  if (!isAdminEmail(email)) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("auth_admin_exists");
    if (error) return false;
    return data === false;
  } catch {
    return false;
  }
}

// Returns the first admin email from ADMIN_EMAILS, or null if unset/invalid.
// Intentionally NOT exported for UI use — the Forbidden page should not
// disclose this; this exists for internal diagnostics only.
export function firstAdminEmailInternal(): string | null {
  return getAdminEmails()[0] ?? null;
}
