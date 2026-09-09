/** Narrow transport contract for the privileged sandbox runtime controller.
 * The application server must talk to this boundary over the private Docker
 * network; it must never receive the Docker socket itself. */
import type { PublishedPort } from "./docker-network";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { SandboxRuntime, SandboxRuntimeAdapter, SandboxRuntimeOptions, SandboxExecResult, SandboxProcessRef } from "./runtime-adapter";

export type RuntimeControllerClient = {
  inspectPublishedPort(runtimeId: string, containerPort?: number): Promise<PublishedPort | null>;
  inspect(runtimeId: string): Promise<{ id: string; status: "created" | "running" | "stopped" | "failed" }>;
  listManaged(): Promise<SandboxRuntime[]>;
};

export class HttpRuntimeControllerClient implements RuntimeControllerClient, Partial<SandboxRuntimeAdapter> {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  constructor(baseUrl: string, fetcher: typeof fetch = fetch) { this.baseUrl = baseUrl; this.fetcher = fetcher; }
  private valid(id: string) { return /^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id); }
  async inspectPublishedPort(runtimeId: string, containerPort = 4173): Promise<PublishedPort | null> {
    if (!this.valid(runtimeId)) return null;
    try {
      const response = await this.fetcher(`${this.baseUrl}/v1/runtimes/${encodeURIComponent(runtimeId)}/ports/${containerPort}`);
      if (!response.ok) return null;
      const value = await response.json() as Partial<PublishedPort>;
      return typeof value.hostIp === "string" && Number.isInteger(value.hostPort) && value.containerPort === containerPort
        ? { hostIp: value.hostIp, hostPort: value.hostPort!, containerPort } : null;
    } catch { return null; }
  }
  async inspect(runtimeId: string) {
    if (!this.valid(runtimeId)) throw new Error("INVALID_RUNTIME_ID");
    const response = await this.fetcher(`${this.baseUrl}/v1/runtimes/${encodeURIComponent(runtimeId)}`);
    if (!response.ok) throw new Error("RUNTIME_CONTROLLER_UNAVAILABLE");
    return await response.json() as { id: string; status: "created" | "running" | "stopped" | "failed" };
  }
  async listManaged(): Promise<SandboxRuntime[]> {
    const response = await this.fetcher(`${this.baseUrl}/v1/runtimes`);
    if (!response.ok) throw new Error("RUNTIME_CONTROLLER_UNAVAILABLE");
    const value = await response.json();
    if (!Array.isArray(value)) throw new Error("RUNTIME_CONTROLLER_UNAVAILABLE");
    return value.flatMap((entry): SandboxRuntime[] => {
      if (!entry || typeof entry !== "object") return [];
      const { id, status } = entry as { id?: unknown; status?: unknown };
      return this.valid(typeof id === "string" ? id : "") && (status === "created" || status === "running" || status === "stopped" || status === "failed")
        ? [{ id: id as string, status }] : [];
    });
  }

  async stop(runtimeId: string): Promise<void> { await this.command(runtimeId, "stop"); }
  async start(runtimeId: string): Promise<SandboxRuntime> { return await this.command(runtimeId, "start") as SandboxRuntime; }
  async restart(runtimeId: string): Promise<SandboxRuntime> { return await this.command(runtimeId, "restart") as SandboxRuntime; }
  async create(options: SandboxRuntimeOptions): Promise<SandboxRuntime> {
    const files = await collectWorkspaceFiles(options.workspacePath);
    const response = await this.fetcher(`${this.baseUrl}/v1/runtimes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ files, preview: options.preview === true, publicEnv: options.publicEnv }) });
    if (!response.ok) throw new Error("RUNTIME_CONTROLLER_UNAVAILABLE");
    return await response.json() as SandboxRuntime;
  }
  async exec(runtimeId: string, intent: "install" | "build"): Promise<SandboxExecResult> { return await this.command(runtimeId, intent) as SandboxExecResult; }
  async startProcess(runtimeId: string, intent: "dev"): Promise<SandboxProcessRef> {
    await this.command(runtimeId, intent);
    return { alive: () => true, stdout: () => "", stderr: () => "", exitCode: () => null, stop: () => { void this.command(runtimeId, "stop"); } };
  }
  private async command(runtimeId: string, intent: string): Promise<unknown> {
    if (!this.valid(runtimeId)) throw new Error("INVALID_RUNTIME_ID");
    const response = await this.fetcher(`${this.baseUrl}/v1/runtimes/${encodeURIComponent(runtimeId)}/${intent}`, { method: "POST" });
    if (!response.ok) throw new Error("RUNTIME_CONTROLLER_UNAVAILABLE");
    const text = await response.text(); return text ? JSON.parse(text) : undefined;
  }
}

async function collectWorkspaceFiles(root: string) {
  const files: Array<{ path: string; content: string }> = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.push({ path: relative(root, absolute).replaceAll("\\", "/"), content: (await readFile(absolute)).toString("base64") });
    }
  }
  await walk(root);
  return files;
}
