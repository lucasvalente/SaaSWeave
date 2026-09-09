import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { client as orpcClient, orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";
import { Link } from "@saasweave/i18n/tanstack-start/components/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@saasweave/ui/components/alert-dialog";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import { ConfirmActionDialog } from "@/shared/ui/confirm-action-dialog";
import {
  Badge,
  ConsoleEmptyState,
  ConsoleErrorState,
  ConsoleSkeleton,
  formatDate,
  Panel,
  PanelHeader,
  SectionHeading
} from "@/shared/ui/console-kit";

type RoleChange = { id: string; roles: ["platform_admin"] };

const PLATFORM_ROLES = [
  "super_admin",
  "platform_admin",
  "engineering",
  "security",
  "support",
  "finance",
  "readonly"
] as const;

function isStepUpRequired(error: unknown): boolean {
  return error instanceof Error && error.message.includes("STEP_UP_REQUIRED");
}

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "suspended">("");
  const [role, setRole] = useState<(typeof PLATFORM_ROLES)[number] | "">("");
  const [mfa, setMfa] = useState<"" | "enabled" | "disabled">("");
  const [sort, setSort] = useState<"createdAt.asc" | "createdAt.desc">("createdAt.desc");
  const [cursors, setCursors] = useState<string[]>([]);
  const [pendingRoleChange, setPendingRoleChange] = useState<RoleChange | null>(null);
  const [totp, setTotp] = useState("");
  const query = useQuery({
    ...orpc.admin.users.list.queryOptions({
      input: {
        cursor: cursors.at(-1),
        limit: 25,
        mfa: mfa === "" ? undefined : mfa === "enabled",
        role: role || undefined,
        search: search || undefined,
        sort,
        status: status || undefined
      }
    }),
    placeholderData: keepPreviousData
  });
  const resetPage = () => setCursors([]);
  const refreshUsers = () => void query.refetch();
  const suspend = useMutation({
    mutationFn: (input: { id: string; suspended: boolean }) =>
      orpcClient.admin.users.suspend(input),
    onSuccess: () => {
      toast.success(m.admin_users__role_updated());
      refreshUsers();
    },
    onError: () => toast.error("Permission denied or request failed")
  });
  const roleChange = useMutation({
    mutationFn: (input: RoleChange) => orpcClient.admin.users.setRoles(input)
  });
  const stepUp = useMutation({
    mutationFn: (code: string) => orpcClient.admin.auth.stepUp({ code })
  });

  const requestRoleChange = async (input: RoleChange) => {
    try {
      await roleChange.mutateAsync(input);
      toast.success(m.admin_users__role_updated());
      refreshUsers();
    } catch (error) {
      if (isStepUpRequired(error)) {
        setTotp("");
        setPendingRoleChange(input);
        return;
      }
      toast.error(m.admin_users__permission_failed());
    }
  };
  const confirmStepUp = async () => {
    if (!pendingRoleChange || !/^\d{6}$/.test(totp)) return;
    try {
      await stepUp.mutateAsync(totp);
      // Retry the original mutation exactly once after the server-side proof.
      await roleChange.mutateAsync(pendingRoleChange);
      toast.success(m.admin_users__role_updated());
      setPendingRoleChange(null);
      setTotp("");
      refreshUsers();
    } catch {
      toast.error(m.admin_users__permission_failed());
    }
  };

  if (query.isError) {
    return (
      <ConsoleErrorState
        description={m.admin_users__permission_failed()}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin_nav__platform()}
        title={m.admin_users__title()}
        description={m.admin_users__subtitle()}
        action={<Badge tone="neutral">{query.data.data.length} shown</Badge>}
      />
      <Panel>
        <PanelHeader
          title={m.admin_users__accounts()}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={m.admin_users__search()}
                className="h-9 w-56 pl-8"
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder={m.admin_users__search_email()}
                type="search"
                value={search}
              />
            </div>
          }
        />
        <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
          <select
            aria-label={m.admin_users__all_statuses()}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              resetPage();
            }}
            value={status}
          >
            <option value="">{m.admin_users__all_statuses()}</option>
            <option value="active">{m.admin_users__active()}</option>
            <option value="suspended">{m.admin_users__suspended()}</option>
          </select>
          <select
            aria-label={m.admin_users__platform_role()}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            onChange={(event) => {
              setRole(event.target.value as typeof role);
              resetPage();
            }}
            value={role}
          >
            <option value="">{m.admin_users__all_roles()}</option>
            {PLATFORM_ROLES.map((platformRole) => (
              <option key={platformRole} value={platformRole}>
                {platformRole}
              </option>
            ))}
          </select>
          <select
            aria-label={m.admin_users__mfa_status()}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            onChange={(event) => {
              setMfa(event.target.value as typeof mfa);
              resetPage();
            }}
            value={mfa}
          >
            <option value="">{m.admin_users__all_mfa()}</option>
            <option value="enabled">{m.admin_users__mfa_enabled()}</option>
            <option value="disabled">{m.admin_users__mfa_disabled()}</option>
          </select>
          <select
            aria-label={m.admin_users__sort_order()}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            onChange={(event) => {
              setSort(event.target.value as typeof sort);
              resetPage();
            }}
            value={sort}
          >
            <option value="createdAt.desc">{m.admin_users__newest()}</option>
            <option value="createdAt.asc">{m.admin_users__oldest()}</option>
          </select>
        </div>
        {query.data.data.length > 0 ? (
          <div className="divide-y divide-border">
            {query.data.data.map((entry) => (
              <div className="flex items-center justify-between gap-4 px-5 py-3.5" key={entry.id}>
                <div>
                  <p className="text-sm font-medium">
                    {entry.name}{" "}
                    {entry.banned ? (
                      <Badge tone="destructive">{m.admin_users__suspended()}</Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.email} · {formatDate(entry.createdAt.toISOString())} ·{" "}
                    {entry.roles.join(", ") || m.admin_users__no_platform_role()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="ghost">
                    <Link params={{ id: entry.id }} to="/admin/users/$id">
                      {m.admin_users__view()}
                    </Link>
                  </Button>
                  <Badge tone={entry.twoFactorEnabled ? "success" : "neutral"}>
                    {entry.twoFactorEnabled
                      ? m.admin_users__mfa_enabled()
                      : m.admin_users__mfa_disabled()}
                  </Badge>
                  {!entry.roles.includes("platform_admin") ? (
                    <Button
                      aria-label={`Grant platform admin to ${entry.email}`}
                      disabled={roleChange.isPending || stepUp.isPending}
                      onClick={() =>
                        void requestRoleChange({ id: entry.id, roles: ["platform_admin"] })
                      }
                      size="sm"
                      variant="outline"
                    >
                      {m.admin_users__grant_admin()}
                    </Button>
                  ) : null}
                  <ConfirmActionDialog
                    confirmLabel={
                      entry.banned ? m.admin_users__reactivate() : m.admin_users__suspend()
                    }
                    description={m.admin_users__audit_description()}
                    onConfirm={() => suspend.mutate({ id: entry.id, suspended: !entry.banned })}
                    title={entry.banned ? m.admin_users__reactivate() : m.admin_users__suspend()}
                  >
                    <Button disabled={suspend.isPending} size="sm" variant="outline">
                      {entry.banned ? m.admin_users__reactivate() : m.admin_users__suspend()}
                    </Button>
                  </ConfirmActionDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ConsoleEmptyState title={m.admin_users__no_results()} />
        )}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button
            disabled={cursors.length === 0 || query.isFetching}
            onClick={() => setCursors((value) => value.slice(0, -1))}
            size="sm"
            variant="outline"
          >
            {m.admin_users__previous()}
          </Button>
          <Button
            disabled={!query.data.meta.nextCursor || query.isFetching}
            onClick={() => setCursors((value) => [...value, query.data.meta.nextCursor as string])}
            size="sm"
            variant="outline"
          >
            {m.admin_users__next()}
          </Button>
        </div>
      </Panel>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !stepUp.isPending) {
            setPendingRoleChange(null);
            setTotp("");
          }
        }}
        open={Boolean(pendingRoleChange)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.admin_users__confirm_identity()}</AlertDialogTitle>
            <AlertDialogDescription>{m.admin_users__mfa_prompt()}</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label={m.admin_users__authenticator_code()}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setTotp(event.target.value.replace(/\D/g, ""))}
            value={totp}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stepUp.isPending}>
              {m.admin_users__cancel()}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!/^\d{6}$/.test(totp) || stepUp.isPending || roleChange.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmStepUp();
              }}
            >
              {m.admin_users__confirm()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
