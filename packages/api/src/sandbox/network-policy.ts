/** Network policies are explicit per lifecycle phase. Install may egress to
 * public registries, while generated applications always run without network.
 * Internal platform networks and host sockets are never attached. */
export type SandboxNetworkPhase = "PREPARE" | "INSTALL" | "BUILD" | "RUNTIME";

export type SandboxNetworkPolicy = {
  phase: SandboxNetworkPhase;
  networkMode: "none" | "isolated-egress" | "isolated-preview";
  publicEgress: boolean;
  internalServices: false;
  hostGateway: false;
  dockerSocket: false;
  metadataEndpoints: false;
};

const base = { internalServices: false, hostGateway: false, dockerSocket: false, metadataEndpoints: false } as const;

export const SANDBOX_NETWORK_POLICIES: Record<SandboxNetworkPhase, SandboxNetworkPolicy> = {
  PREPARE: { phase: "PREPARE", networkMode: "none", publicEgress: false, ...base },
  INSTALL: { phase: "INSTALL", networkMode: "isolated-egress", publicEgress: true, ...base },
  BUILD: { phase: "BUILD", networkMode: "none", publicEgress: false, ...base },
  RUNTIME: { phase: "RUNTIME", networkMode: "isolated-preview", publicEgress: false, ...base },
};

export function getSandboxNetworkPolicy(phase: SandboxNetworkPhase): SandboxNetworkPolicy {
  return SANDBOX_NETWORK_POLICIES[phase];
}

/** Docker flags for the isolated runtime. INSTALL is provisioned separately by
 * the worker and is never reused for BUILD or RUNTIME. */
export function dockerNetworkArgs(phase: SandboxNetworkPhase): readonly string[] {
  const policy = getSandboxNetworkPolicy(phase);
  if (policy.networkMode === "none") return ["--network=none"];
  if (policy.networkMode === "isolated-egress") return ["--network=sandbox-install-network"];
  return ["--network=sandbox-preview-network"];
}

export function isInternalAccessDenied(policy: SandboxNetworkPolicy): boolean {
  return !policy.internalServices && !policy.hostGateway && !policy.dockerSocket && !policy.metadataEndpoints;
}
