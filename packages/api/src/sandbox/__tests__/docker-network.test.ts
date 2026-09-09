// @ts-nocheck
import { describe, expect, it } from "vitest";
import { resolvePreviewUpstream, validatePublishedPort } from "../docker-network";
describe("preview port binding", () => {
  it("accepts only loopback mapping for the controlled port", () => { const p = { hostIp: "127.0.0.1", hostPort: 49152, containerPort: 4173 }; expect(validatePublishedPort(p, 4173)).toBe(true); expect(resolvePreviewUpstream(p, 4173)).toBe("http://127.0.0.1:49152"); });
  it("rejects public, wrong and invalid mappings", () => { expect(validatePublishedPort({ hostIp: "0.0.0.0", hostPort: 49152, containerPort: 4173 }, 4173)).toBe(false); expect(resolvePreviewUpstream({ hostIp: "127.0.0.1", hostPort: 49152, containerPort: 3000 }, 4173)).toBeNull(); });
});
