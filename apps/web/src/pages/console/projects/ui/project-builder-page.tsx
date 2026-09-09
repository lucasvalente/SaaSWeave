import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { orpc } from "@saasweave/api/client/tanstack-start/orpc";
import { m } from "@saasweave/i18n/messages";

import { ConsoleErrorState, ConsoleSkeleton, Panel, SectionHeading } from "@/shared/ui/console-kit";
import { projectStatusLabel } from "./project-status";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!
  );
}

/** Builder workspace shell. Generation controls are intentionally absent until the API exists. */
export function ProjectBuilderPage({ projectId }: { projectId: string }) {
  const query = useQuery(orpc.console.projects.get.queryOptions({ input: { projectId } }));
  const builder = useQuery(orpc.console.builder.state.queryOptions({ input: { projectId } }));
  const files = useQuery(orpc.console.builder.files.queryOptions({ input: { projectId } }));
  const sandboxes = useQuery(orpc.console.sandbox.list.queryOptions({ input: { projectId } }));
  const [prompt, setPrompt] = useState("");
  const [suppressedPreviewId, setSuppressedPreviewId] = useState<string | null>(null);
  const sendPrompt = useMutation(
    orpc.console.builder.sendPrompt.mutationOptions({
      onSuccess: () => {
        setPrompt("");
        void builder.refetch();
      }
    })
  );
  const applyPlan = useMutation(
    orpc.console.builder.apply.mutationOptions({
      onSuccess: () => void builder.refetch()
    })
  );
  const initialize = useMutation(
    orpc.console.builder.initialize.mutationOptions({
      onSuccess: () => void builder.refetch()
    })
  );
  const preview = useMutation(orpc.console.sandbox.previewUrl.mutationOptions());
  const startPreview = useMutation(
    orpc.console.sandbox.create.mutationOptions({
      onSuccess: async () => {
        setSuppressedPreviewId(null);
        preview.reset();
        await sandboxes.refetch();
      }
    })
  );
  const stopPreview = useMutation(
    orpc.console.sandbox.stop.mutationOptions({
      onMutate: ({ sessionId }) => {
        setSuppressedPreviewId(sessionId);
        preview.reset();
      },
      onSuccess: async () => {
        await sandboxes.refetch();
        preview.reset();
      }
    })
  );
  const restartPreview = useMutation(
    orpc.console.sandbox.restart.mutationOptions({
      onMutate: ({ sessionId }) => {
        setSuppressedPreviewId(sessionId);
        preview.reset();
      },
      onSuccess: async () => {
        await sandboxes.refetch();
        preview.reset();
      }
    })
  );
  const activeSandbox = sandboxes.data?.find((entry) => entry.status === "running");
  const latestSnapshot = builder.data?.snapshots[0];
  const pendingPlan = builder.data?.session?.status === "planning" ? builder.data.plan : null;
  useEffect(() => {
    if (
      activeSandbox?.previewReadyAt &&
      activeSandbox.id !== suppressedPreviewId &&
      !preview.data &&
      !preview.isPending
    )
      preview.mutate({ projectId, sessionId: activeSandbox.id });
  }, [
    activeSandbox?.id,
    activeSandbox?.previewReadyAt,
    suppressedPreviewId,
    preview.data,
    preview.isPending,
    preview.mutate,
    projectId
  ]);
  if (query.isError)
    return (
      <ConsoleErrorState description={m.project__not_found()} onRetry={() => query.refetch()} />
    );
  if (!query.data) return <ConsoleSkeleton />;
  const project = query.data;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow={m.admin_nav__projects()}
          title={m.builder__title()}
          description={m.builder__description()}
        />
        <div className="flex items-center gap-2 pt-1">
          <Link className="rounded-md border px-3 py-2 text-sm" to="/app/projects">
            {m.builder__back_to_projects()}
          </Link>
          <Link className="rounded-md border px-3 py-2 text-sm" params={{ projectId }} to="/app/projects/$projectId/settings">
            {m.builder__settings()}
          </Link>
        </div>
      </div>
      <Panel>
        <div className="grid gap-0 divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <section aria-labelledby="builder-prompt-title" className="space-y-3">
            <h2 className="font-semibold" id="builder-prompt-title">
              {m.builder__prompt_title()}
            </h2>
            <p className="text-sm text-muted-foreground">{m.builder__prompt_description()}</p>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              aria-label={m.builder__prompt_label()}
              className="min-h-32 w-full rounded-md border bg-background p-3 text-sm"
              placeholder={m.builder__prompt_placeholder()}
            />
            <button
              type="button"
              disabled={!prompt.trim() || sendPrompt.isPending}
              onClick={() => sendPrompt.mutate({ projectId, content: prompt })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {sendPrompt.isPending ? m.console_common__saving() : m.console_common__save_changes()}
            </button>
            {sendPrompt.isError && (
              <p role="alert" className="text-sm text-destructive">
                {m.customer_project__create_error()}
              </p>
            )}
            {pendingPlan && (
              <button
                type="button"
                disabled={applyPlan.isPending}
                onClick={() =>
                  applyPlan.mutate({
                    projectId,
                    sessionId: builder.data!.session!.id,
                    operations: [
                      {
                        type: "update",
                        path: "index.html",
                        content: `<!doctype html><html><body><main>${escapeHtml(pendingPlan.summary)}</main></body></html>`
                      }
                    ]
                  })
                }
                className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {applyPlan.isPending ? m.console_common__saving() : m.builder__apply_plan()}
              </button>
            )}
            {applyPlan.isError && (
              <p role="alert" className="text-sm text-destructive">
                {m.customer_project__create_error()}
              </p>
            )}
          </section>
          <aside aria-label={m.builder__project_context()} className="p-5">
            <h2 className="font-semibold">{m.builder__project_context()}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{m.customer_project__name()}</dt>
                <dd>{project.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{m.project__workspace()}</dt>
                <dd>{project.workspaceName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{m.workspaces__status()}</dt>
                <dd>{projectStatusLabel(project.status)}</dd>
              </div>
            </dl>
          </aside>
        </div>
        <div className="border-t p-5 lg:col-span-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{m.builder__title()}</h2>
            {!builder.data?.snapshots.length && (
              <button
                type="button"
                disabled={initialize.isPending}
                onClick={() => initialize.mutate({ projectId })}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {initialize.isPending
                  ? m.console_common__creating()
                  : m.customer_project__create_first()}
              </button>
            )}
          </div>
          {builder.isLoading && (
            <p className="mt-3 text-sm text-muted-foreground">{m.console_common__opening()}</p>
          )}
          {builder.data?.plan && <p className="mt-3 text-sm">{builder.data.plan.summary}</p>}
          {builder.data?.messages.map((message) => (
            <p key={message.id} className="mt-2 text-sm text-muted-foreground">
              {message.content}
            </p>
          ))}
          {builder.data?.snapshots[0] && (
            <p className="mt-3 text-xs text-muted-foreground">
              {m.builder__files_count({
                count: Object.keys(builder.data.snapshots[0].manifest as object).length
              })}
            </p>
          )}
          <section className="mt-6 border-t pt-5" aria-labelledby="builder-preview-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="builder-preview-title" className="font-semibold">
                  {m.builder__preview_title()}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {m.builder__preview_description()}
                </p>
              </div>
              <div className="flex gap-2">
                {!activeSandbox && latestSnapshot && (
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    disabled={startPreview.isPending}
                    onClick={() =>
                      startPreview.mutate({ projectId, snapshotId: latestSnapshot.id })
                    }
                  >
                    {startPreview.isPending
                      ? m.builder__preview_starting()
                      : m.builder__preview_start()}
                  </button>
                )}
                {activeSandbox && (
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                    disabled={restartPreview.isPending || stopPreview.isPending}
                    onClick={() =>
                      restartPreview.mutate({ projectId, sessionId: activeSandbox.id })
                    }
                  >
                    {restartPreview.isPending
                      ? m.builder__preview_restarting()
                      : m.builder__preview_restart()}
                  </button>
                )}
                {activeSandbox && (
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                    disabled={stopPreview.isPending || restartPreview.isPending}
                    onClick={() => stopPreview.mutate({ projectId, sessionId: activeSandbox.id })}
                  >
                    {stopPreview.isPending
                      ? m.builder__preview_stopping()
                      : m.builder__preview_stop()}
                  </button>
                )}
              </div>
            </div>
            {(startPreview.isError ||
              stopPreview.isError ||
              restartPreview.isError ||
              preview.isError) && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {m.builder__preview_failed()}
              </p>
            )}
            {activeSandbox?.previewReadyAt && (
              <p className="mt-3 text-sm text-emerald-600" role="status">
                {m.builder__preview_ready()}
              </p>
            )}
            <div
              className="mt-3 flex min-h-32 items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center"
              role="status"
            >
              {preview.data?.url ? (
                <iframe
                  title={m.builder__preview_frame_title()}
                  src={preview.data.url}
                  className="h-[420px] w-full rounded-md border bg-white"
                  sandbox="allow-scripts"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {startPreview.isPending || restartPreview.isPending
                    ? m.builder__preview_starting()
                    : m.builder__preview_unavailable()}
                </p>
              )}
            </div>
          </section>
          <div className="mt-4 border-t pt-4" aria-label={m.builder__project_context()}>
            <h3 className="font-medium">{m.builder__project_context()}</h3>
            {files.isLoading && (
              <p className="text-sm text-muted-foreground">{m.common__loading()}</p>
            )}
            {!files.isLoading && !files.data?.length && (
              <p className="text-sm text-muted-foreground">{m.console_batch_jobs__empty_title()}</p>
            )}
            <ul className="mt-2 grid gap-1 text-sm">
              {files.data?.map((file) => (
                <li key={file.path} className="rounded px-2 py-1 font-mono">
                  {file.path}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  );
}
