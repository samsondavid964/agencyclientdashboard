/** Shim until full user-name resolution via mb_user_id FK is wired. */
export function formatMBDisplay(email: string | null | undefined): string {
  if (!email) return "Unassigned";
  const local = email.split("@")[0];
  return local
    .replace(/[._]/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
