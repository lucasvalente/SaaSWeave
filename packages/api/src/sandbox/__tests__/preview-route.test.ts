// @ts-nocheck
import { describe, expect, it } from "vitest";
import { handlePreviewRoute } from "../preview-route";
import { issuePreviewToken } from "../preview-gateway";
import { createHmac } from "node:crypto";
describe("preview route", () => {
  const claims = { projectId: "p", workspaceId: "w", subjectId: "u", sandboxId: "s" };
  const token = (expiresAt = Math.floor(Date.now() / 1000) + 60) => issuePreviewToken({ ...claims, expiresAt }, "secret");
  it("rejects forged token and never trusts client upstream", async () => { const response = await handlePreviewRoute(new Request("http://preview.local"), { token: "forged", projectId: "p", workspaceId: "w" }, { secret: "secret", resolveUpstream: async () => "http://evil.invalid" }); expect(response.status).toBe(403); });
  it("rejects missing, expired, and wrong-scope capabilities", async () => {
    const deps = { secret: "secret", resolveUpstream: async () => "http://127.0.0.1:4173" };
    expect((await handlePreviewRoute(new Request("http://preview.local"), { token: "", projectId: "p" }, deps)).status).toBe(403);
    const expiredPayload = Buffer.from(JSON.stringify({ ...claims, expiresAt: Math.floor(Date.now() / 1000) - 1 })).toString("base64url");
    const expired = `${expiredPayload}.${createHmac("sha256", "secret").update(expiredPayload).digest("base64url")}`;
    expect((await handlePreviewRoute(new Request("http://preview.local"), { token: expired, projectId: "p", workspaceId: "w" }, deps)).status).toBe(403);
    expect((await handlePreviewRoute(new Request("http://preview.local"), { token: token(), projectId: "other", workspaceId: "w" }, deps)).status).toBe(403);
    expect((await handlePreviewRoute(new Request("http://preview.local"), { token: token(), projectId: "p", workspaceId: "other" }, deps)).status).toBe(403);
  });
  it("proxies only server-resolved local upstream", async () => { const token = issuePreviewToken({ projectId: "p", workspaceId: "w", subjectId: "u", sandboxId: "s", expiresAt: Math.floor(Date.now() / 1000) + 60 }, "secret"); const response = await handlePreviewRoute(new Request("http://preview.local"), { token, projectId: "p", workspaceId: "w" }, { secret: "secret", resolveUpstream: async () => "http://127.0.0.1:4173", fetchImpl: async () => new Response("ok") }); expect(response.status).toBe(200); });
  it("blocks a sandbox that has not passed health supervision", async () => { const token = issuePreviewToken({ projectId: "p", workspaceId: "w", subjectId: "u", sandboxId: "s", expiresAt: Math.floor(Date.now() / 1000) + 60 }, "secret"); const response = await handlePreviewRoute(new Request("http://preview.local"), { token, projectId: "p", workspaceId: "w" }, { secret: "secret", resolveUpstream: async () => "http://127.0.0.1:4173", isHealthy: async () => false }); expect(response.status).toBe(503); });
  it("blocks missing mapping, stopped/failed runtime and arbitrary upstream", async () => {
    const base = { secret: "secret", resolveUpstream: async () => "http://127.0.0.1:4173" };
    expect((await handlePreviewRoute(new Request("http://preview.local"), { token: token(), projectId: "p", workspaceId: "w" }, { ...base, resolveUpstream: async () => null })).status).toBe(502);
    for (const status of ["stopped", "failed"]) expect((await handlePreviewRoute(new Request("http://preview.local"), { token: token(), projectId: "p", workspaceId: "w" }, { ...base, loadSandbox: async () => ({ runtimeId: "s" } as any), revalidateRuntime: async () => ({ ready: false, status } as any) })).status).toBe(503);
    expect((await handlePreviewRoute(new Request("http://preview.local"), { token: token(), projectId: "p", workspaceId: "w" }, { ...base, resolveUpstream: async () => "http://evil.invalid:80" })).status).toBe(502);
  });
});
