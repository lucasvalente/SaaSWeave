import { validatePublishedPort, type PublishedPort } from "./docker-network";

export type PreviewSandboxState = { runtimeId: string | null; status: string; previewContainerPort: number | null; previewHostIp: string | null; previewHostPort: number | null };
export type PreviewRevalidation = { ready: boolean; mapping: PublishedPort | null; reason?: "MISSING_RUNTIME" | "NOT_RUNNING" | "MISSING_MAPPING" | "INVALID_MAPPING" | "STALE_MAPPING" };

/** Docker is authoritative; persisted port fields are treated as cache only. */
export async function revalidatePreviewRuntime(sandbox: PreviewSandboxState, runtime: { inspectPublishedPort?: (id: string, port?: number) => Promise<PublishedPort | null> }, expectedContainerPort = 4173): Promise<PreviewRevalidation> {
  if (!sandbox.runtimeId) return { ready: false, mapping: null, reason: "MISSING_RUNTIME" };
  if (sandbox.status !== "running") return { ready: false, mapping: null, reason: "NOT_RUNNING" };
  if (!runtime.inspectPublishedPort) return { ready: false, mapping: null, reason: "MISSING_MAPPING" };
  const mapping = await runtime.inspectPublishedPort(sandbox.runtimeId, expectedContainerPort);
  if (!mapping) return { ready: false, mapping: null, reason: "MISSING_MAPPING" };
  if (!validatePublishedPort(mapping, expectedContainerPort)) return { ready: false, mapping, reason: "INVALID_MAPPING" };
  const stale = sandbox.previewHostIp !== mapping.hostIp || sandbox.previewHostPort !== mapping.hostPort || sandbox.previewContainerPort !== mapping.containerPort;
  return { ready: true, mapping, ...(stale ? { reason: "STALE_MAPPING" as const } : {}) };
}
