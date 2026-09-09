import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { client, orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import {
  ConsoleEmptyState,
  ConsoleErrorState,
  ConsoleSkeleton,
  Panel,
  SectionHeading,
  formatDate
} from "@/shared/ui/console-kit";
import { projectStatusLabel } from "./project-status";

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "draft" | "active" | "archived">("");
  const [cursors, setCursors] = useState<string[]>([]);
  const list = useQuery(
    orpc.console.projects.list.queryOptions({
      input: {
        cursor: cursors.at(-1),
        search: search || undefined,
        status: status || undefined
      }
    })
  );
  const create = useMutation({
    mutationFn: () =>
      client.console.projects.create({ name, description: description || undefined }),
    onSuccess: (project) => {
      setName("");
      setDescription("");
      void queryClient.invalidateQueries({
        queryKey: orpc.console.projects.list.queryKey({ input: {} })
      });
      toast.success(m.customer_project__created());
      void navigate({ to: "/app/projects/$projectId/build", params: { projectId: project.id } });
    },
    onError: () => toast.error(m.customer_project__create_error())
  });
  if (list.isError)
    {return (
      <ConsoleErrorState
        description={m.customer_project__load_error()}
        onRetry={() => list.refetch()}
      />
    );}
  if (!list.data) return <ConsoleSkeleton />;
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.customer_project__workspace()}
        title={m.admin_nav__projects()}
        description={m.customer_project__description()}
      />
      <Panel>
        <div className="flex gap-2 p-4">
          <Input
            aria-label={m.project__search()}
            onChange={(event) => {
              setSearch(event.target.value);
              setCursors([]);
            }}
            placeholder={m.project__search()}
            value={search}
          />
          <select
            aria-label={m.workspaces__status()}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setCursors([]);
            }}
            value={status}
          >
            <option value="">{m.customer_project__current()}</option>
            <option value="draft">{m.project__draft()}</option>
            <option value="active">{m.project__active()}</option>
            <option value="archived">{m.project__archived()}</option>
          </select>
        </div>
        <div className="space-y-3 border-t p-4">
          <Input
            id="new-project-name"
            aria-label={m.customer_project__name()}
            ref={nameInputRef}
            onChange={(event) => setName(event.target.value)}
            placeholder={m.customer_project__name()}
            value={name}
          />
          <Input
            aria-label={m.project__description()}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={m.customer_project__description_placeholder()}
            value={description}
          />
          <Button
            disabled={create.isPending}
            onClick={() => {
              if (!name.trim()) {
                nameInputRef.current?.focus();
                toast.error(m.customer_project__name());
                return;
              }
              create.mutate();
            }}
          >
            {m.customer_project__new()}
          </Button>
        </div>
        {list.data.data.length > 0 ? (
          <ul className="divide-y">
            {list.data.data.map((item) => (
              <li className="px-5 py-4" key={item.id}>
                <Link
                  className="font-medium hover:underline"
                  params={{ projectId: item.id }}
                  to="/app/projects/$projectId"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {projectStatusLabel(item.status)} · {m.customer_project__updated()}{" "}
                  {formatDate(item.updatedAt.toISOString())}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ConsoleEmptyState
            title={m.customer_project__no_projects()}
            description={m.customer_project__create_first()}
          />
        )}
        <div className="flex justify-end gap-2 border-t p-4">
          <Button
            disabled={cursors.length === 0 || list.isFetching}
            onClick={() => setCursors((value) => value.slice(0, -1))}
            variant="outline"
          >
            {m.project__previous()}
          </Button>
          <Button
            disabled={!list.data.meta.nextCursor || list.isFetching}
            onClick={() => setCursors((value) => [...value, list.data.meta.nextCursor as string])}
            variant="outline"
          >
            {m.project__load_more()}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
