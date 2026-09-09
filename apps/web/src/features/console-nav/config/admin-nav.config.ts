import {
  Building2,
  ShieldCheck,
  KeyRound,
  LayoutDashboard,
  Mail,
  ScrollText,
  Settings,
  SlidersHorizontal,
  Tag,
  FolderKanban,
  Gauge,
  Users
} from "lucide-react";

import { m } from "@saasweave/i18n/messages";

import { type ConsoleNavGroup } from "@/features/console-nav/config/console-nav.config";

export const adminNav: ConsoleNavGroup[] = [
  {
    heading: m.admin_nav__platform(),
    items: [
      { exact: true, icon: LayoutDashboard, label: m.console_nav__overview(), to: "/admin" },
      { icon: Building2, label: m.admin_nav__workspaces(), to: "/admin/workspaces" },
      { icon: FolderKanban, label: m.admin_nav__projects(), to: "/admin/projects" },
      { icon: Tag, label: m.admin_nav__plans_catalog(), to: "/admin/plans" },
      { icon: Tag, label: m.subscriptions__title(), to: "/admin/subscriptions" },
      { icon: Tag, label: m.console_billing__title(), to: "/admin/billing" },
      { icon: Gauge, label: m.admin_usage__title(), to: "/admin/usage" },
      { icon: Users, label: m.admin_nav__users(), to: "/admin/users" }
    ]
  },
  {
    heading: m.admin_nav__control(),
    items: [
      { icon: KeyRound, label: m.admin_nav__roles_permissions(), to: "/admin/access/roles" },
      { icon: ShieldCheck, label: m.admin_nav__sessions(), to: "/admin/sessions" },
      { icon: ShieldCheck, label: m.admin_nav__security_events(), to: "/admin/security/events" },
      { icon: SlidersHorizontal, label: m.admin_nav__feature_flags(), to: "/admin/feature-flags" },
      { icon: ShieldCheck, label: m.admin_nav__system_health(), to: "/admin/system/health" },
      { icon: Gauge, label: m.console_batch_jobs__title(), to: "/admin/system/jobs" },
      { icon: Gauge, label: m.admin_system__workers_title(), to: "/admin/system/workers" },
      { icon: Gauge, label: m.admin_system__incidents_title(), to: "/admin/system/incidents" },
      { icon: Mail, label: m.admin_nav__emails(), to: "/admin/emails" },
      { icon: ScrollText, label: m.admin_nav__audit_log(), to: "/admin/audit" },
      { icon: Settings, label: m.admin_nav__platform_settings(), to: "/admin/settings" }
    ]
  }
];

const routePermissions: Record<string, string> = {
  "/admin": "platform.dashboard.read",
  "/admin/users": "users.read",
  "/admin/workspaces": "workspaces.read",
  "/admin/projects": "projects.read",
  "/admin/plans": "plans.read",
  "/admin/subscriptions": "subscriptions.read",
  "/admin/usage": "usage.read",
  "/admin/billing": "billing.read",
  "/admin/access/roles": "users.roles.manage",
  "/admin/sessions": "sessions.read",
  "/admin/security/events": "security.events.read",
  "/admin/feature-flags": "feature_flags.read",
  "/admin/features": "feature_flags.read",
  "/admin/emails": "system_settings.write",
  "/admin/audit": "audit.read",
  "/admin/settings": "system_settings.read",
  "/admin/system/health": "infrastructure.read",
  "/admin/system/jobs": "infrastructure.read",
  "/admin/system/workers": "infrastructure.read",
  "/admin/system/incidents": "infrastructure.read"
};
export function getAllowedAdminNav(permissions: readonly string[]): ConsoleNavGroup[] {
  return adminNav
    .map((group) => {
      return {
        ...group,
        items: group.items.filter((item) =>
          Boolean(item.to && permissions.includes(routePermissions[item.to] ?? ""))
        )
      };
    })
    .filter((group) => group.items.length > 0);
}

