import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";
import { Label } from "@saasweave/ui/components/label";

import { publicSettingsQueryKeys } from "@/shared/api/get-public-settings.query";
import { ConfirmActionDialog } from "@/shared/ui/confirm-action-dialog";
import {
  ConsoleErrorState,
  ConsoleSkeleton,
  Panel,
  PanelHeader,
  SectionHeading,
  Segmented,
  Switch
} from "@/shared/ui/console-kit";

import {
  adminSettingsQueryKeys,
  type AdminSettingsQueryResult,
  useGetAdminSettingsQuery
} from "@/pages/admin/settings/api/get-settings.query";
import { useUpdateSettingsMutation } from "@/pages/admin/settings/api/update-settings.mutation";

import { type BillingMode } from "@/config/platform.config";

export function AdminSettingsPage() {
  const query = useGetAdminSettingsQuery();

  if (query.isError) {
    return (
      <ConsoleErrorState
        description={m.admin_settings__permission_error()}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;

  return <SettingsForm settings={query.data} />;
}

function SettingsForm({ settings }: { settings: AdminSettingsQueryResult }) {
  const queryClient = useQueryClient();
  const [platformName, setPlatformName] = useState(settings.platformName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [billingMode, setBillingMode] = useState<BillingMode>(settings.billingMode);
  const [currency, setCurrency] = useState(settings.currency);

  // The public platform.settings cache (sign-up gate, maintenance banner) is a separate
  // query key from admin.settings.get, so every successful write must invalidate both.
  function invalidateSettingsQueries() {
    void queryClient.invalidateQueries({ queryKey: adminSettingsQueryKeys.all() });
    void queryClient.invalidateQueries({ queryKey: publicSettingsQueryKeys.all() });
  }

  const mutation = useUpdateSettingsMutation({
    onError: (error) => toast.error(error.message || m.admin_settings__update_failed()),
    onSuccess: () => {
      toast.success(m.admin_settings__saved());
      invalidateSettingsQueries();
    }
  });

  const generalDirty =
    platformName !== settings.platformName || supportEmail !== settings.supportEmail;
  const billingDirty = billingMode !== settings.billingMode || currency !== settings.currency;

  function toggle(key: "signupsOpen" | "trialsEnabled" | "maintenanceMode", next: boolean) {
    mutation.mutate(
      { [key]: next },
      {
        onSuccess: () => {
          toast.success(next ? m.admin_settings__enabled() : m.admin_settings__disabled());
          invalidateSettingsQueries();
        }
      }
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Platform"
        title={m.admin_settings__title()}
        description={m.admin_settings__description()}
      />

      <Panel>
        <PanelHeader
          title={m.admin_settings__general()}
          description={m.admin_settings__identity_description()}
          action={
            <Button
              disabled={!generalDirty || mutation.isPending}
              onClick={() => mutation.mutate({ platformName, supportEmail })}
              size="sm"
            >
              {mutation.isPending ? m.plans__saving() : m.plans__save()}
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="platform-name">{m.admin_settings__platform_name()}</Label>
            <Input
              id="platform-name"
              onChange={(event) => setPlatformName(event.target.value)}
              value={platformName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">{m.admin_settings__support_email()}</Label>
            <Input
              id="support-email"
              onChange={(event) => setSupportEmail(event.target.value)}
              type="email"
              value={supportEmail}
            />
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={m.admin_settings__billing()}
          description={m.admin_settings__billing_description()}
          action={
            <Button
              disabled={!billingDirty || mutation.isPending}
              onClick={() => mutation.mutate({ billingMode, currency })}
              size="sm"
            >
              {mutation.isPending ? m.plans__saving() : m.plans__save()}
            </Button>
          }
        />
        <div className="space-y-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {m.admin_settings__billing_model()}
              </p>
              <p className="text-sm text-muted-foreground">
                {m.admin_settings__billing_model_description()}
              </p>
            </div>
            <Segmented
              ariaLabel={m.admin_settings__billing_model()}
              onChange={setBillingMode}
              options={[
                { label: m.admin_settings__subscription(), value: "subscription" },
                { label: m.admin_settings__usage(), value: "usage" },
                { label: m.admin_settings__hybrid(), value: "hybrid" }
              ]}
              value={billingMode}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">{m.admin_settings__currency()}</Label>
              <Input
                id="currency"
                onChange={(event) => setCurrency(event.target.value)}
                value={currency}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">{m.admin_settings__payment_provider()}</Label>
              <Input disabled id="provider" value="Stripe" />
            </div>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={m.admin_settings__access()}
          description={m.admin_settings__access_description()}
        />
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {m.admin_settings__open_signups()}
              </p>
              <p className="text-sm text-muted-foreground">
                {m.admin_settings__open_signups_description()}
              </p>
            </div>
            <Switch
              checked={settings.signupsOpen}
              disabled={mutation.isPending}
              label={m.admin_settings__toggle_open_signups()}
              onChange={(next) => toggle("signupsOpen", next)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {m.admin_settings__free_trials()}
              </p>
              <p className="text-sm text-muted-foreground">
                {m.admin_settings__free_trials_description()}
              </p>
            </div>
            <Switch
              checked={settings.trialsEnabled}
              disabled={mutation.isPending}
              label={m.admin_settings__toggle_free_trials()}
              onChange={(next) => toggle("trialsEnabled", next)}
            />
          </div>
        </div>
      </Panel>

      <Panel
        className={settings.maintenanceMode ? "border-destructive/50" : "border-destructive/30"}
      >
        <PanelHeader
          title={m.admin_settings__danger_zone()}
          description={m.admin_settings__danger_description()}
        />
        <div className="p-5">
          {settings.maintenanceMode ? (
            <Button
              disabled={mutation.isPending}
              onClick={() => toggle("maintenanceMode", false)}
              variant="outline"
            >
              {m.admin_settings__disable_maintenance()}
            </Button>
          ) : (
            <ConfirmActionDialog
              confirmLabel={m.admin_settings__enable_maintenance()}
              description={m.admin_settings__enable_maintenance_description()}
              onConfirm={() => toggle("maintenanceMode", true)}
              title={m.admin_settings__enable_maintenance_title()}
            >
              <Button disabled={mutation.isPending} variant="destructive">
                {m.admin_settings__enable_maintenance()}
              </Button>
            </ConfirmActionDialog>
          )}
        </div>
      </Panel>
    </div>
  );
}
