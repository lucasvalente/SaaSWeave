import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { client, orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";
import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import { ConfirmActionDialog } from "@/shared/ui/confirm-action-dialog";
import { ConsoleErrorState, ConsoleSkeleton, Panel, SectionHeading } from "@/shared/ui/console-kit";

export function ProjectSettingsPage({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery(orpc.console.projects.get.queryOptions({ input: { projectId } }));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [supabaseRef, setSupabaseRef] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const supabase = useQuery(orpc.console.projectSupabase.get.queryOptions({ input: { projectId } }));
  useEffect(() => {
    if (query.data) {
      setName(query.data.name);
      setDescription(query.data.description ?? "");
    }
  }, [query.data]);
  const update = useMutation({
    mutationFn: () => client.console.projects.update({ projectId, name, description }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: orpc.console.projects.get.queryKey({ input: { projectId } })
      });
      void queryClient.invalidateQueries({
        queryKey: orpc.console.projects.list.queryKey({ input: {} })
      });
      toast.success(m.project__updated());
    },
    onError: () => toast.error(m.customer_project__update_error())
  });
  const archive = useMutation({
    mutationFn: () => client.console.projects.archive({ projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: orpc.console.projects.get.queryKey({ input: { projectId } })
      });
      void queryClient.invalidateQueries({
        queryKey: orpc.console.projects.list.queryKey({ input: {} })
      });
      toast.success(m.project__archived_toast());
      void navigate({ to: "/app/projects" });
    },
    onError: () => toast.error(m.customer_project__archive_error())
  });
  const saveSupabase = useMutation({
    mutationFn: () => client.console.projectSupabase.configure({ projectId, projectRef: supabaseRef, publicUrl: supabaseUrl, publicAnonKey: supabaseAnonKey }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orpc.console.projectSupabase.get.queryKey({ input: { projectId } }) });
      toast.success(m.supabase__configured());
    },
    onError: () => toast.error(m.supabase__save_error())
  });
  if (query.isError)
    {return (
      <ConsoleErrorState description={m.project__not_found()} onRetry={() => query.refetch()} />
    );}
  if (!query.data) return <ConsoleSkeleton />;
  const project = query.data;
  const editable = project.status !== "archived";
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow={m.admin_nav__projects()}
        title={m.console_nav__settings()}
        description={m.customer_project__slug_stable()}
      />
      <Panel>
        <div className="space-y-3 p-5">
          <Input
            aria-label={m.customer_project__name()}
            value={name}
            disabled={!editable}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            aria-label={m.project__description()}
            value={description}
            disabled={!editable}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button
            disabled={!editable || update.isPending || !name.trim()}
            onClick={() => update.mutate()}
          >
            {m.customer_project__save_changes()}
          </Button>
          <ConfirmActionDialog
            confirmLabel={m.project__archive()}
            description={m.customer_project__archive_description()}
            onConfirm={() => archive.mutate()}
            title={m.project__archive_confirm()}
          >
            <Button disabled={!editable || archive.isPending} variant="destructive">
              {m.project__archive()}
            </Button>
          </ConfirmActionDialog>
        </div>
      </Panel>
      <Panel>
        <div className="space-y-3 p-5">
          <SectionHeading title={m.supabase__title()} description={m.supabase__description()} />
          <Input aria-label={m.supabase__project_ref()} value={supabaseRef} placeholder={supabase.data?.projectRef ?? "project-ref"} disabled={!editable} onChange={(event) => setSupabaseRef(event.target.value)} />
          <Input aria-label={m.supabase__url()} value={supabaseUrl} placeholder={supabase.data?.publicUrl ?? "https://project.supabase.co"} disabled={!editable} onChange={(event) => setSupabaseUrl(event.target.value)} />
          <Input aria-label={m.supabase__anon_key()} type="password" value={supabaseAnonKey} disabled={!editable} onChange={(event) => setSupabaseAnonKey(event.target.value)} />
          <Button disabled={!editable || saveSupabase.isPending || !supabaseRef || !supabaseUrl || !supabaseAnonKey} onClick={() => saveSupabase.mutate()}>{m.supabase__save()}</Button>
        </div>
      </Panel>
    </div>
  );
}
