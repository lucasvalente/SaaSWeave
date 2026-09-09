import { Search } from "lucide-react";
import { useState } from "react";

import { m } from "@saasweave/i18n/messages";
import { Link } from "@saasweave/i18n/tanstack-start/components/link";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import {
  Badge,
  ConsoleErrorState,
  ConsoleSkeleton,
  formatNumber,
  formatRelativeTime,
  Panel,
  PanelHeader,
  SectionHeading,
  StatTile
} from "@/shared/ui/console-kit";

import {
  useGetWorkspacesQuery,
  type WorkspacesInput
} from "@/pages/admin/workspaces/api/get-workspaces.query";

const STATUS_TONE = {
  active: "success",
  suspended: "destructive"
} as const;

const STATUS_LABEL = {
  active: () => m.user_detail__status_active(),
  suspended: () => m.user_detail__status_suspended()
} as const;

export function AdminWorkspacesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WorkspacesInput["status"]>();
  const [sort, setSort] = useState<NonNullable<WorkspacesInput["sort"]>>("createdAt.desc");
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const query = useGetWorkspacesQuery({ search, status, sort, cursor: cursors.at(-1), limit: 25 });

  const workspaces = query.data?.workspaces;
  const filtered = workspaces ?? [];

  if (query.isError) {
    return (
      <ConsoleErrorState description={m.workspaces__load_error()} onRetry={() => query.refetch()} />
    );
  }
  if (!workspaces) return <ConsoleSkeleton />;

  const active = workspaces.filter((ws) => ws.status === "active").length;
  const suspended = workspaces.filter((ws) => ws.operationalStatus === "suspended").length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Platform"
        title={m.workspaces__title()}
        description={m.workspaces__subtitle()}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={m.workspaces__total()} value={formatNumber(workspaces.length)} />
        <StatTile label={m.user_detail__status_active()} value={formatNumber(active)} />
        <StatTile label={m.user_detail__status_suspended()} value={formatNumber(suspended)} />
        <StatTile
          label={m.admin_nav__projects()}
          value={formatNumber(workspaces.reduce((total, ws) => total + ws.projectCount, 0))}
        />
      </div>

      <Panel>
        <PanelHeader
          title={m.workspaces__all_title()}
          action={
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCursors([undefined]);
                }}
                placeholder={m.workspaces__search_placeholder()}
                aria-label={m.workspaces__search()}
                className="h-9 w-56 pl-8"
              />
            </div>
          }
        />
        <div className="flex gap-3 p-4">
          <label>
            {m.workspaces__status()}{" "}
            <select
              aria-label={m.workspaces__status()}
              value={status ?? ""}
              onChange={(event) => {
                setStatus(
                  event.target.value === ""
                    ? undefined
                    : (event.target.value as WorkspacesInput["status"])
                );
                setCursors([undefined]);
              }}
            >
              <option value="">{m.workspaces__all()}</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label()}
                </option>
              ))}
            </select>
          </label>
          <label>
            {m.workspaces__sort()}{" "}
            <select
              aria-label={m.workspaces__newest()}
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setCursors([undefined]);
              }}
            >
              <option value="createdAt.desc">{m.workspaces__newest()}</option>
              <option value="createdAt.asc">{m.workspaces__oldest()}</option>
            </select>
          </label>
          <Button
            variant="outline"
            disabled={cursors.length === 1}
            onClick={() => setCursors((value) => value.slice(0, -1))}
          >
            {m.workspaces__previous()}
          </Button>
          <Button
            variant="outline"
            disabled={!query.data?.nextCursor}
            onClick={() => setCursors((value) => [...value, query.data?.nextCursor ?? undefined])}
          >
            {m.workspaces__next()}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-3 font-medium">{m.workspaces__title()}</th>
                <th className="px-5 py-3 font-medium">{m.workspaces__status()}</th>
                <th className="px-5 py-3 text-right font-medium">{m.workspace__members()}</th>
                <th className="px-5 py-3 text-right font-medium">{m.admin_nav__projects()}</th>
                <th className="px-5 py-3 text-right font-medium">{m.workspaces__updated()}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((ws) => (
                <tr key={ws.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-5 py-3">
                    <Link
                      className="font-medium text-foreground hover:underline"
                      params={{ id: ws.id }}
                      to="/admin/workspaces/$id"
                    >
                      {ws.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{ws.owner}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[ws.operationalStatus]}>
                      {STATUS_LABEL[ws.operationalStatus]()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">
                    {formatNumber(ws.memberCount)}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">
                    {formatNumber(ws.projectCount)}{" "}
                    <span className="text-xs">
                      ({ws.activeProjectCount} {m.workspaces__active_projects()})
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {formatRelativeTime(ws.updatedAt)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    {m.workspaces__no_results()}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
