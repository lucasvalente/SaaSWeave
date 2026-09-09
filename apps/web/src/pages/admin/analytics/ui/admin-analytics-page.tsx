import { SectionHeading } from "@/shared/ui/console-kit";
import { m } from "@saasweave/i18n/messages";

import { AdminOverview } from "@/features/admin-monitoring";

export function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin_nav__platform()}
        title={m.admin_home__title()}
        description={m.admin_home__description()}
      />
      <AdminOverview />
    </div>
  );
}
