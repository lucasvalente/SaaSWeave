// @ts-nocheck
import { describe, expect, it } from "vitest";
import { probeSandboxHealth } from "../health-supervisor";
describe("sandbox health supervisor", () => {
  it("reports healthy response", async () => { const result = await probeSandboxHealth("http://sandbox.local/health", 50, async () => new Response("ok", { status: 200 })); expect(result.healthy).toBe(true); });
  it("reports timeout", async () => { const result = await probeSandboxHealth("http://sandbox.local/health", 1, (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))); expect(result.healthy).toBe(false); expect(result.error).toBe("TIMEOUT"); });
});
