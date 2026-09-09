import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

import { useGetPlansQuery } from "@/shared/api/get-plans.query";
import { auditIcon, auditSentence } from "@/shared/ui/audit";
import {
  Badge,
  ConsoleEmptyState,
  ConsoleErrorState,
  ConsoleSkeleton,
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  Panel,
  PanelHeader,
  SectionHeading,
  Segmented
} from "@/shared/ui/console-kit";

import {
  useGetWorkspaceDetailQuery,
  workspaceDetailQueryKeys,
  type WorkspaceDetailQueryResult
} from "@/pages/admin/workspaces/api/get-workspace-detail.query";
import { useSetWorkspaceFeatureMutation } from "@/pages/admin/workspaces/api/set-workspace-feature.mutation";
import { useUpdateWorkspacePlanMutation } from "@/pages/admin/workspaces/api/update-workspace-plan.mutation";
import {
  useReactivateWorkspaceMutation,
  useSuspendWorkspaceMutation
} from "@/pages/admin/workspaces/api/workspace-lifecycle.mutation";

type Feature = WorkspaceDetailQueryResult["features"][number];

const STATUS_TONE = {
  active: "success",
  canceled: "neutral",
  past_due: "destructive",
  trialing: "info"
} as const;

function roleLabel(role: string) {
  if (role === "owner") return m.workspace__role_owner();
  if (role === "admin") return m.workspace__role_admin();
  if (role === "member") return m.workspace__role_member();
  return role;
}

function PlanPanel({ workspace }: { workspace: WorkspaceDetailQueryResult }) {
  const queryClient = useQueryClient();
  const plansQuery = useGetPlansQuery();
  const mutation = useUpdateWorkspacePlanMutation({
    onError: (error) => toast.error(error.message || m.workspace__plan_updated()),
    onSuccess: () => {
      toast.success(m.workspace__plan_updated());
      void queryClient.invalidateQueries({ queryKey: workspaceDetailQueryKeys.byId(workspace.id) });
    }
  });

  const status = (
    workspace.status in STATUS_TONE ? workspace.status : "active"
  ) as keyof typeof STATUS_TONE;

  return (
    <Panel>
      <PanelHeader
        title={m.workspace__plan_billing()}
        description={workspace.owner?.email ?? m.workspace__owner_missing()}
      />
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">{m.workspace__status()}</p>
          <p className="mt-1">
            <Badge tone={STATUS_TONE[status]}>{status.replace("_", " ")}</Badge>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{m.workspace__mrr()}</p>
          <p className="mt-1 font-medium text-foreground tabular-nums">
            {formatCurrency(workspace.plan.mrr)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{m.workspace__seats_included()}</p>
          <p className="mt-1 font-medium text-foreground tabular-nums">
            {formatNumber(workspace.plan.seatsIncluded)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{m.workspace__created()}</p>
          <p className="mt-1 font-medium text-foreground">{formatDate(workspace.createdAt)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
        <span className="text-sm text-muted-foreground">{m.workspace__plan_label()}</span>
        {plansQuery.data ? (
          <Segmented
            ariaLabel={m.workspace__plan_label()}
            onChange={(planId) => mutation.mutate({ id: workspace.id, planId })}
            options={plansQuery.data.map((plan) => {
              return { label: plan.name, value: plan.id };
            })}
            value={workspace.plan.id}
          />
        ) : null}
        {mutation.isPending ? (
          <span className="text-xs text-muted-foreground">{m.workspace__saving()}</span>
        ) : null}
      </div>
    </Panel>
  );
}

function TeamPanel({ workspace }: { workspace: WorkspaceDetailQueryResult }) {
  return (
    <Panel>
      <PanelHeader
        title={m.workspace__team()}
        description={`${workspace.team.members.length} ${m.workspace__members().toLowerCase()} · ${workspace.team.invitations.length} ${m.workspace__pending_invites()}`}
      />
      {workspace.team.members.length > 0 ? (
        <ul className="divide-y divide-border">
          {workspace.team.members.map((member) =>
            (
              <li className="flex items-center justify-between gap-4 px-5 py-3" key={member.id}>
                <div>
                  <p className="text-sm text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <Badge tone={member.role === "owner" ? "brand" : "neutral"}>
                  {roleLabel(member.role)}
                </Badge>
              </li>
            )
          )}
        </ul>
      ) : (
        <ConsoleEmptyState title={m.workspace__no_members()} />
      )}
    </Panel>
  );
}

function OperationalPanel({ workspace }: { workspace: WorkspaceDetailQueryResult }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: workspaceDetailQueryKeys.byId(workspace.id) });
  const suspend = useSuspendWorkspaceMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      toast.success(m.workspace__suspended());
      setOpen(false);
      setReason("");
      refresh();
    }
  });
  const reactivate = useReactivateWorkspaceMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      toast.success(m.workspace__reactivated());
      refresh();
    }
  });
  const suspended = workspace.operationalStatus === "suspended";
  return (
    <Panel>
      <PanelHeader title={m.console_nav__overview()} description={m.workspaces__subtitle()} />
      <div className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">{m.workspace__owner()}</p>
          <p>{workspace.owner?.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{m.workspace__status()}</p>
          <Badge tone={suspended ? "destructive" : "success"}>{workspace.operationalStatus}</Badge>
        </div>
        <div>
          <p className="text-muted-foreground">{m.workspace__members()}</p>
          <p>{workspace.memberCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{m.workspace__projects()}</p>
          <p>
            {workspace.projectCount} ({workspace.activeProjectCount} active)
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{m.workspace__created()}</p>
          <p>{formatDate(workspace.createdAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{m.workspace__updated()}</p>
          <p>{formatDate(workspace.updatedAt)}</p>
        </div>
        {suspended ? (
          <>
            <div>
              <p className="text-muted-foreground">{m.workspace__suspended_at()}</p>
              <p>{workspace.suspendedAt ? formatDate(workspace.suspendedAt) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{m.workspace__reason()}</p>
              <p>{workspace.suspensionReason ?? "—"}</p>
            </div>
          </>
        ) : null}
      </div>
      <div className="border-t border-border p-5">
        {suspended ? (
          <Button
            onClick={() => reactivate.mutate({ id: workspace.id })}
            disabled={reactivate.isPending}
          >
            {m.admin_users__reactivate()} Workspace
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => setOpen(true)}>
            {m.admin_users__suspend()} Workspace
          </Button>
        )}
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.admin_users__suspend()} Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Projects remain readable, but project mutations are blocked until reactivation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            aria-label={m.workspace__suspension_reason()}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{m.console_common__cancel()}</AlertDialogCancel>
            <AlertDialogAction
              disabled={reason.trim().length < 3 || suspend.isPending}
              onClick={(event) => {
                event.preventDefault();
                suspend.mutate({ id: workspace.id, reason: reason.trim() });
              }}
            >
              {m.admin_users__suspend()} Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function FeatureOverridesPanel({ workspace }: { workspace: WorkspaceDetailQueryResult }) {
  const queryClient = useQueryClient();
  const mutation = useSetWorkspaceFeatureMutation({
    onError: (error) => toast.error(error.message || m.workspace__feature_override_updated()),
    onSuccess: () => {
      toast.success(m.workspace__feature_override_updated());
      void queryClient.invalidateQueries({ queryKey: workspaceDetailQueryKeys.byId(workspace.id) });
    }
  });

  function valueFor(feature: Feature): "inherit" | "on" | "off" {
    if (!feature.overridden) return "inherit";
    return feature.enabledForOrg ? "on" : "off";
  }

  return (
    <Panel>
      <PanelHeader
        title={m.workspace__feature_overrides()}
        description="Force a feature on or off for this workspace only, regardless of the global default"
      />
      <div className="divide-y divide-border">
        {workspace.features.map((feature) => (
          <div className="flex items-center justify-between gap-4 px-5 py-3.5" key={feature.key}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{feature.name}</p>
              <p className="text-xs text-muted-foreground">
                Global default: {feature.enabled ? "on" : "off"}
                {!feature.planEligible ? " · not included on this plan" : ""}
              </p>
            </div>
            <Segmented
              ariaLabel={`Override ${feature.name}`}
              onChange={(next) => {
                if (next === "inherit") {
                  mutation.mutate({
                    enabled: null,
                    key: feature.key,
                    organizationId: workspace.id
                  });
                } else {
                  mutation.mutate({
                    enabled: next === "on",
                    key: feature.key,
                    organizationId: workspace.id
                  });
                }
              }}
              options={[
                { label: m.workspace__inherit(), value: "inherit" },
                { label: m.workspace__on(), value: "on" },
                { label: m.workspace__off(), value: "off" }
              ]}
              value={valueFor(feature)}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActivityPanel({ workspace }: { workspace: WorkspaceDetailQueryResult }) {
  return (
    <Panel>
      <PanelHeader
        title={m.user_detail__recent_audit()}
        description={m.user_detail__workspace_description()}
      />
      {workspace.activity.length > 0 ? (
        <ul className="divide-y divide-border">
          {workspace.activity.map((entry) => {
            const Icon = auditIcon(entry.action);
            return (
              <li className="flex items-start gap-3 px-5 py-3.5" key={entry.id}>
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{auditSentence(entry)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(entry.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ConsoleEmptyState title={m.user_detail__no_audit()} />
      )}
    </Panel>
  );
}

export function AdminWorkspaceDetailPage({ id }: { id: string }) {
  const query = useGetWorkspaceDetailQuery(id);

  if (query.isError) {
    return (
      <ConsoleErrorState description={m.workspaces__load_error()} onRetry={() => query.refetch()} />
    );
  }
  if (!query.data) return <ConsoleSkeleton />;

  const workspace = query.data;

  return (
    <div className="space-y-8">
      <div>
        <Button asChild className="mb-3 px-0" size="sm" variant="ghost">
          <Link to="/admin/workspaces">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {m.workspaces__previous()} {m.workspaces__title()}
          </Link>
        </Button>
        <SectionHeading
          eyebrow={m.admin_nav__platform()}
          title={workspace.name}
          description={`/${workspace.slug}`}
        />
      </div>

      <OperationalPanel workspace={workspace} />
      <PlanPanel workspace={workspace} />
      <TeamPanel workspace={workspace} />
      <FeatureOverridesPanel workspace={workspace} />
      <ActivityPanel workspace={workspace} />
    </div>
  );
}
