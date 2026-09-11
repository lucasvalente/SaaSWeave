import {
  AlertTriangle,
  Bell,
  Car,
  Cpu,
  CreditCard,
  FileCheck2,
  FileText,
  FolderKanban,
  KeyRound,
  Layers,
  LayoutDashboard,
  type LucideIcon,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Webhook
} from "lucide-react";

import { m } from "@saasweave/i18n/messages";
import { type LinkProps } from "@saasweave/i18n/tanstack-start/components/link";

export type ConsoleNavItem = {
  label: string;
  to: LinkProps["to"];
  icon: LucideIcon;
  /** Match this path exactly (used for the index/overview route). */
  exact?: boolean;
  /** When set, the item is hidden unless this feature is enabled for the workspace. */
  featureKey?: string;
};

export type ConsoleNavGroup = {
  heading: string;
  items: ConsoleNavItem[];
};

export function getConsoleNav(): ConsoleNavGroup[] {
  return [
    {
      heading: "AUTUAX Trânsito",
      items: [
        { icon: AlertTriangle, label: "Multas & Infrações", to: "/app/fines" as LinkProps["to"] },
        { icon: FileText, label: "Processos & Defesas", to: "/app/cases" as LinkProps["to"] },
        { icon: Car, label: "Veículos & Frota", to: "/app/vehicles" as LinkProps["to"] },
        { icon: Users, label: "Condutores", to: "/app/drivers" as LinkProps["to"] },
        { icon: Cpu, label: "Análise de Vícios", to: "/app/analysis" as LinkProps["to"] },
        { icon: FileCheck2, label: "Protocolos", to: "/app/protocols" as LinkProps["to"] }
      ]
    },
    {
      heading: m.console_nav__workspace_heading(),
      items: [
        { exact: true, icon: LayoutDashboard, label: m.console_nav__overview(), to: "/app" },
        { icon: FolderKanban, label: m.admin_nav__projects(), to: "/app/projects" },
        {
          featureKey: "ai_assistant",
          icon: Sparkles,
          label: m.console_nav__ai_usage(),
          to: "/app/ai-usage"
        },
        {
          featureKey: "batch_jobs",
          icon: Layers,
          label: m.console_nav__batch_jobs(),
          to: "/app/batch-jobs"
        },
        {
          featureKey: "billing_portal",
          icon: CreditCard,
          label: m.console_nav__billing(),
          to: "/app/billing"
        },
        {
          featureKey: "api_keys",
          icon: KeyRound,
          label: m.console_nav__api_keys(),
          to: "/app/api-keys"
        },
        {
          featureKey: "webhooks",
          icon: Webhook,
          label: m.console_nav__webhooks(),
          to: "/app/webhooks"
        }
      ]
    },
    {
      heading: m.console_nav__organization_heading(),
      items: [
        {
          featureKey: "team_management",
          icon: Users,
          label: m.console_nav__team(),
          to: "/app/team"
        },
        {
          featureKey: "notifications",
          icon: Bell,
          label: m.console_nav__notifications(),
          to: "/app/notifications"
        },
        { icon: UserRound, label: m.console_nav__profile(), to: "/app/profile" },
        {
          featureKey: "audit_logs",
          icon: ScrollText,
          label: m.console_nav__audit(),
          to: "/app/audit"
        },
        { icon: Settings, label: m.console_nav__settings(), to: "/app/settings" },
        {
          featureKey: "two_factor",
          icon: ShieldCheck,
          label: m.console_nav__security(),
          to: "/app/security"
        }
      ]
    }
  ];
}
