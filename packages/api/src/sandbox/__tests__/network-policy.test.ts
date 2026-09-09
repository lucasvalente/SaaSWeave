// @ts-nocheck
import { describe, expect, it } from "vitest";
import { dockerNetworkArgs, getSandboxNetworkPolicy, isInternalAccessDenied } from "../network-policy";

describe("sandbox network policy", () => {
  it("allows public registry egress only during install", () => {
    expect(getSandboxNetworkPolicy("INSTALL")).toMatchObject({ networkMode: "isolated-egress", publicEgress: true });
    expect(dockerNetworkArgs("INSTALL")).toEqual(["--network=sandbox-install-network"]);
  });

  it("keeps build and runtime isolated", () => {
    for (const phase of ["PREPARE", "BUILD"] as const) {
      expect(getSandboxNetworkPolicy(phase)).toMatchObject({ networkMode: "none", publicEgress: false });
      expect(dockerNetworkArgs(phase)).toEqual(["--network=none"]);
    }
    expect(getSandboxNetworkPolicy("RUNTIME")).toMatchObject({ networkMode: "isolated-preview", publicEgress: false });
    expect(dockerNetworkArgs("RUNTIME")).toEqual(["--network=sandbox-preview-network"]);
  });

  it("denies internal services, host gateway, socket and metadata in every phase", () => {
    for (const phase of ["PREPARE", "INSTALL", "BUILD", "RUNTIME"] as const) {
      const policy = getSandboxNetworkPolicy(phase);
      expect(isInternalAccessDenied(policy)).toBe(true);
      expect(policy.internalServices).toBe(false);
      expect(policy.hostGateway).toBe(false);
      expect(policy.dockerSocket).toBe(false);
      expect(policy.metadataEndpoints).toBe(false);
    }
  });
});
