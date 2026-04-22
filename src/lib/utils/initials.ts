/**
 * Derive display initials from a name or email.
 *
 *   "Jane Doe"        → "JD"
 *   "jane.doe"        → "JD"
 *   "jane@ad-lab.io"  → "JA"  (first 2 chars of local-part, upper-cased)
 *   null / ""         → "?"
 */
export function getInitials(nameOrEmail: string | null | undefined, maxLen = 2): string {
  if (!nameOrEmail) return "?";
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return "?";

  // If it looks like an email, use the local-part.
  const base = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;

  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return base.slice(0, maxLen).toUpperCase();
  }

  if (parts.length === 1) {
    // Single token — take the first `maxLen` characters so "jane" → "JA".
    return parts[0].slice(0, maxLen).toUpperCase();
  }

  return parts
    .slice(0, maxLen)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
