// @ts-nocheck
import { describe, expect, it } from "vitest";
import { revalidatePreviewRuntime } from "../preview-revalidation";
describe("preview runtime revalidation", () => {
  const runtime = { inspectPublishedPort: async () => ({ hostIp: "127.0.0.1", hostPort: 49152, containerPort: 4173 }) };
  it("accepts matching Docker mapping", async () => { const r = await revalidatePreviewRuntime({ runtimeId: "abc", status: "running", previewContainerPort: 4173, previewHostIp: "127.0.0.1", previewHostPort: 49152 }, runtime); expect(r.ready).toBe(true); expect(r.reason).toBeUndefined(); });
  it("flags stale cache without trusting it", async () => { const r = await revalidatePreviewRuntime({ runtimeId: "abc", status: "running", previewContainerPort: 4173, previewHostIp: "127.0.0.1", previewHostPort: 4000 }, runtime); expect(r.ready).toBe(true); expect(r.reason).toBe("STALE_MAPPING"); expect(r.mapping.hostPort).toBe(49152); });
  it("fails closed for stopped or missing runtime", async () => { expect((await revalidatePreviewRuntime({ runtimeId: null, status: "running", previewContainerPort: null, previewHostIp: null, previewHostPort: null }, runtime)).ready).toBe(false); expect((await revalidatePreviewRuntime({ runtimeId: "abc", status: "stopped", previewContainerPort: 4173, previewHostIp: null, previewHostPort: null }, runtime)).reason).toBe("NOT_RUNNING"); });
});
