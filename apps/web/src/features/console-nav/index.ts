export {
  useConsoleFeatureEnabled,
  useConsoleNavGroups
} from "@/features/console-nav/hooks/use-console-nav";
export { ConsoleSidebar, SidebarPlanCard } from "@/features/console-nav/ui/console-sidebar";
export { ConsoleTopbar } from "@/features/console-nav/ui/console-topbar";
export { ConsoleOrgSwitcher } from "@/features/console-nav/ui/console-org-switcher";
export { adminNav, getAllowedAdminNav } from "@/features/console-nav/config/admin-nav.config";
export { AdminCommandPalette } from "@/features/console-nav/ui/admin-command-palette";
export type { ConsoleNavGroup } from "@/features/console-nav/config/console-nav.config";
export { requireConsoleFeature } from "@/features/console-nav/lib/require-console-feature";
