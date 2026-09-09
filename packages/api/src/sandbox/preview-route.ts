import { proxyPreviewRequest, verifyPreviewToken, type PreviewClaims } from "./preview-gateway";
import type { PreviewSandboxState, PreviewRevalidation } from "./preview-revalidation";

export type PreviewRouteDeps = { secret: string; resolveUpstream: (claims: PreviewClaims) => Promise<string | null>; isHealthy?: (claims: PreviewClaims) => Promise<boolean>; loadSandbox?: (claims: PreviewClaims) => Promise<PreviewSandboxState | null>; revalidateRuntime?: (sandbox: PreviewSandboxState) => Promise<PreviewRevalidation>; persistPreview?: (sandbox: PreviewSandboxState, result: PreviewRevalidation) => Promise<void>; fetchImpl?: typeof fetch };

/** Public preview route handler: all upstream addressing is resolved server-side from validated claims. */
export async function handlePreviewRoute(request: Request, params: { token: string; projectId: string; workspaceId?: string }, deps: PreviewRouteDeps): Promise<Response> {
  const claims = verifyPreviewToken(params.token, deps.secret);
  // The public URL carries project + sandbox only. Bind project here and bind
  // workspace/sandbox through the server-side loadSandbox query below.
  if (!claims || claims.projectId !== params.projectId || (params.workspaceId !== undefined && claims.workspaceId !== params.workspaceId)) return new Response("PREVIEW_FORBIDDEN", { status: 403 });
  if (deps.loadSandbox && deps.revalidateRuntime) {
    const sandbox = await deps.loadSandbox(claims);
    if (!sandbox) return new Response("PREVIEW_NOT_READY", { status: 503 });
    const validation = await deps.revalidateRuntime(sandbox);
    if (!validation.ready) return new Response("PREVIEW_NOT_READY", { status: 503 });
    if (deps.persistPreview) await deps.persistPreview(sandbox, validation);
  }
  const upstream = await deps.resolveUpstream(claims);
  if (!upstream) return new Response("PREVIEW_UPSTREAM_UNAVAILABLE", { status: 502 });
  if (deps.isHealthy && !(await deps.isHealthy(claims))) return new Response("PREVIEW_NOT_READY", { status: 503 });
  let parsed: URL;
  try { parsed = new URL(upstream); } catch { return new Response("PREVIEW_UPSTREAM_UNAVAILABLE", { status: 502 }); }
  if (!/^https?:$/.test(parsed.protocol) || !["127.0.0.1", "localhost", "[::1]", "host.docker.internal"].includes(parsed.hostname) || !parsed.port) return new Response("PREVIEW_UPSTREAM_UNAVAILABLE", { status: 502 });
  return proxyPreviewRequest(parsed.toString(), request, 10_000, deps.fetchImpl);
}
