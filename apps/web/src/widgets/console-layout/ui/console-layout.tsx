import { TriangleAlert } from "lucide-react";
import type React from "react";
import { Suspense } from "react";

import { m } from "@saasweave/i18n/messages";
import { type LinkProps } from "@saasweave/i18n/tanstack-start/components/link";

import { useGetPublicSettingsQuery } from "@/shared/api/get-public-settings.query";

import { ConsoleSidebar, ConsoleTopbar, type ConsoleNavGroup } from "@/features/console-nav";
import { ImpersonationBanner } from "@/features/impersonation";
import { NotificationBell } from "@/features/notifications";

function MaintenanceBanner() {
  const query = useGetPublicSettingsQuery();
  if (!query.data?.maintenanceMode) return null;

  return (
    <div className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-2 border-b px-4 py-2 text-sm sm:px-6 lg:px-8">
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">{m.global__maintenance_on()}</span>{" "}
        {m.global__maintenance_unavailable()}
      </span>
    </div>
  );
}

/**
 * Shared application shell used by both the workspace console and the platform
 * admin surface. Pass the nav groups, home link, and any topbar extras.
 */
export function ConsoleLayout({
  children,
  groups,
  homeTo,
  ariaLabel,
  footer,
  badge,
  actions,
  topSlot,
  showNotifications = true
}: {
  children: React.ReactNode;
  groups: ConsoleNavGroup[];
  homeTo: LinkProps["to"];
  ariaLabel: string;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  topSlot?: React.ReactNode;
  /** Workspace shells can suppress notifications when the capability is unavailable. */
  showNotifications?: boolean;
}) {
  return (
    <div className="flex min-h-svh w-full bg-muted/40">
      <ConsoleSidebar
        groups={groups}
        homeTo={homeTo}
        ariaLabel={ariaLabel}
        footer={footer}
        topSlot={topSlot}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopbar
          groups={groups}
          homeTo={homeTo}
          ariaLabel={ariaLabel}
          badge={badge}
          actions={
            <>
              {actions}
              {showNotifications ? (
                <Suspense fallback={null}>
                  <NotificationBell />
                </Suspense>
              ) : null}
            </>
          }
        />
        <MaintenanceBanner />
        <ImpersonationBanner />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
