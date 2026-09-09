import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";
import { Link } from "@saasweave/i18n/tanstack-start/components/link";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import {
  ConsoleErrorState,
  ConsoleSkeleton,
  Panel,
  PanelHeader,
  SectionHeading
} from "@/shared/ui/console-kit";

export function AdminProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "draft" | "active" | "archived">("");
  const [cursors, setCursors] = useState<string[]>([]);
  const query = useQuery(
    orpc.admin.projects.list.queryOptions({
      input: { cursor: cursors.at(-1), search: search || undefined, status: status || undefined }
    })
  );
  if (query.isError)
    {return (
      <ConsoleErrorState description={m.workspaces__load_error()} onRetry={() => query.refetch()} />
    );}
  if (!query.data) return <ConsoleSkeleton />;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin_nav__platform()}
        title={m.admin_nav__projects()}
        description={m.project__cross_workspace()}
      />
      <Panel>
        <PanelHeader
          title={m.project__all()}
          action={
            <Input
              aria-label={m.project__search()}
              className="h-9 w-64"
              onChange={(event) => {
                setSearch(event.target.value);
                setCursors([]);
              }}
              placeholder={m.project__search_placeholder()}
              type="search"
              value={search}
            />
          }
        />
        <div className="flex gap-3 border-b p-4">
          <select
            aria-label={m.workspaces__status()}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setCursors([]);
            }}
            value={status}
          >
            <option value="">{m.project__all_statuses()}</option>
            <option value="draft">{m.project__draft()}</option>
            <option value="active">{m.project__active()}</option>
            <option value="archived">{m.project__archived()}</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-4">{m.admin_nav__projects()}</th>
                <th className="p-4">{m.project__workspace()}</th>
                <th className="p-4">{m.project__owner_creator()}</th>
                <th className="p-4">{m.workspaces__status()}</th>
                <th className="p-4">{m.project__updated()}</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((entry) => (
                <tr className="border-b" key={entry.id}>
                  <td className="p-4">
                    <Link
                      className="font-medium hover:underline"
                      params={{ projectId: entry.id }}
                      to="/admin/projects/$projectId"
                    >
                      {entry.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{entry.id}</div>
                  </td>
                  <td className="p-4">{entry.workspaceName}</td>
                  <td className="p-4">
                    {entry.workspaceOwner ?? m.project__no_owner()}
                    <div className="text-xs text-muted-foreground">{entry.creatorName}</div>
                  </td>
                  <td className="p-4">{entry.status}</td>
                  <td className="p-4">{entry.updatedAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 p-4">
          <Button
            disabled={cursors.length === 0 || query.isFetching}
            onClick={() => setCursors((value) => value.slice(0, -1))}
            variant="outline"
          >
            {m.project__previous()}
          </Button>
          <Button
            disabled={!query.data.meta.nextCursor || query.isFetching}
            onClick={() => setCursors((value) => [...value, query.data.meta.nextCursor as string])}
            variant="outline"
          >
            {m.project__next()}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
