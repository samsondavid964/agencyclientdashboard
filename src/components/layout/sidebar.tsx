import { getAuthenticatedUser, isAdmin } from "@/lib/utils/auth";
import { getInitials } from "@/lib/utils/initials";
import {
  SidebarBrand,
  SidebarNav,
  SidebarThemeToggle,
  SidebarUserPanel,
  SidebarShell,
} from "./sidebar-content";

export async function Sidebar() {
  const user = await getAuthenticatedUser();
  const admin = isAdmin(user);

  const userName = user.user_metadata?.full_name || "Team Member";
  const avatarUrl = user.user_metadata?.avatar_url || null;
  const initials = getInitials(
    user.user_metadata?.full_name || user.email || "U"
  );

  return (
    <SidebarShell>
      {/* Brand header */}
      <div className="flex h-[72px] w-full shrink-0 items-center border-b border-white/[0.06] px-3">
        <SidebarBrand />
      </div>

      {/* Nav + bottom section */}
      <SidebarNav isAdmin={admin} />

      {/* Theme toggle */}
      <SidebarThemeToggle />

      {/* User panel */}
      <SidebarUserPanel
        userName={userName}
        userEmail={user.email || ""}
        userInitials={initials}
        avatarUrl={avatarUrl}
        isAdmin={admin}
      />
    </SidebarShell>
  );
}

// Export user data for the mobile sidebar
export async function getSidebarUserData() {
  const user = await getAuthenticatedUser();
  const admin = isAdmin(user);
  const userName = user.user_metadata?.full_name || "Team Member";
  const avatarUrl = user.user_metadata?.avatar_url || null;
  const initials = getInitials(
    user.user_metadata?.full_name || user.email || "U"
  );

  return {
    userName,
    userEmail: user.email || "",
    userInitials: initials,
    avatarUrl,
    isAdmin: admin,
  };
}
