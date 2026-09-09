import { spawn } from "node:child_process";

export const PREVIEW_NETWORK_NAME = "sandbox-preview-network";

function docker(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => { const p = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] }); let out = ""; let err = ""; p.stdout.on("data", d => out += String(d)); p.stderr.on("data", d => err += String(d)); p.once("error", reject); p.once("close", c => c === 0 ? resolve(out) : reject(new Error(err || "DOCKER_FAILED"))); });
}

/** Idempotently provisions the platform-owned preview boundary. */
export async function ensurePreviewNetwork(): Promise<void> {
  try {
    const raw = await docker(["network", "inspect", PREVIEW_NETWORK_NAME]);
    const info = JSON.parse(raw)[0] as { Driver?: string; Internal?: boolean };
    if (info.Driver !== "bridge" || info.Internal === true) throw new Error("PREVIEW_NETWORK_INCOMPATIBLE");
  } catch (error) {
    if (error instanceof Error && error.message === "PREVIEW_NETWORK_INCOMPATIBLE") throw error;
    await docker(["network", "create", "--driver", "bridge", PREVIEW_NETWORK_NAME]);
  }
}

export type PublishedPort = { hostIp: string; hostPort: number; containerPort: number };
export function validatePublishedPort(port: PublishedPort, expectedContainerPort: number): boolean {
  return port.containerPort === expectedContainerPort && port.hostIp === "127.0.0.1" && Number.isInteger(port.hostPort) && port.hostPort >= 1024 && port.hostPort <= 65535;
}

export function resolvePreviewUpstream(port: PublishedPort, expectedContainerPort: number): string | null {
  return validatePublishedPort(port, expectedContainerPort) ? `http://127.0.0.1:${port.hostPort}` : null;
}

/** Reads Docker's structured port mapping; never parses `docker ps` text. */
export async function inspectPublishedPort(containerId: string, containerPort = 4173): Promise<PublishedPort | null> {
  if (!/^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(containerId)) return null;
  try {
    const raw = await docker(["inspect", "--format", "{{json .NetworkSettings.Ports}}", "--", containerId]);
    const ports = JSON.parse(raw.trim()) as Record<string, Array<{ HostIp?: string; HostPort?: string }> | null>;
    const bindings = ports[`${containerPort}/tcp`];
    const binding = bindings?.[0];
    if (!binding?.HostIp || !binding.HostPort) return null;
    const hostPort = Number(binding.HostPort);
    return { hostIp: binding.HostIp, hostPort, containerPort };
  } catch { return null; }
}
