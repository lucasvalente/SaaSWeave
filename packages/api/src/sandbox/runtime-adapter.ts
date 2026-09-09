import { spawn } from "node:child_process";
import { ensurePreviewNetwork, PREVIEW_NETWORK_NAME } from "./docker-network";
import { inspectPublishedPort, type PublishedPort } from "./docker-network";

export type SandboxRuntimeStatus = "created" | "running" | "stopped" | "failed";
export type SandboxRuntime = { id: string; status: SandboxRuntimeStatus };
export type SandboxRuntimeCommand = "install" | "build" | "dev";
export type SandboxExecResult = { exitCode: number; stdout: string; stderr: string; timedOut: boolean; startedAt: string; finishedAt: string; durationMs: number; truncated: boolean };
export type SandboxProcessRef = { alive: () => boolean; stdout: () => string; stderr: () => string; exitCode: () => number | null; stop: () => void };
export type SandboxRuntimeDiagnostics = { packageJson: boolean; lockfile: boolean; cwd: string; user: string; node: string; pnpm: string; listener4173: boolean; internalStatus: number | null; internalError?: string };
export type SandboxRuntimeOptions = { image: string; workspacePath: string; network: "none"; memoryMb: number; cpuCount: number; internalPort?: number; hostPort?: number; preview?: boolean; publicEnv?: Record<"VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY", string> };

export interface SandboxRuntimeAdapter {
  create(options: SandboxRuntimeOptions): Promise<SandboxRuntime>;
  stop(id: string): Promise<void>;
  inspect?(id: string): Promise<SandboxRuntime>;
  /** Controller-scoped inventory; it must never enumerate arbitrary Docker containers. */
  listManaged?(): Promise<SandboxRuntime[]>;
  start?(id: string): Promise<SandboxRuntime>;
  inspectPublishedPort?(id: string, containerPort?: number): Promise<PublishedPort | null>;
  exec?(id: string, command: SandboxRuntimeCommand, cwd?: string): Promise<SandboxExecResult>;
  startProcess?(id: string, command: SandboxRuntimeCommand, cwd?: string): Promise<SandboxProcessRef>;
  diagnose?(id: string): Promise<SandboxRuntimeDiagnostics>;
}

const SAFE_IMAGE = /^[a-z0-9][a-z0-9._/-]{0,127}(?::[a-zA-Z0-9][a-zA-Z0-9._-]{0,127})?$/;
// Workspace paths may be absolute inside the isolated container (e.g. /workspace),
// while still rejecting traversal and shell metacharacters.
const SAFE_WORKSPACE = /^\/?[a-zA-Z0-9._\\/: -]{1,256}$/;

export class DockerSandboxRuntimeAdapter implements SandboxRuntimeAdapter {
  private readonly docker: string;
  constructor(docker = "docker") { this.docker = docker; }

  async create(options: SandboxRuntimeOptions): Promise<SandboxRuntime> {
    if (!SAFE_IMAGE.test(options.image) || !SAFE_WORKSPACE.test(options.workspacePath)) throw new Error("INVALID_SANDBOX_INPUT");
    if (options.network !== "none" || options.memoryMb < 64 || options.memoryMb > 4096 || options.cpuCount < 1 || options.cpuCount > 4) throw new Error("INVALID_SANDBOX_POLICY");
    if (options.preview) await ensurePreviewNetwork();
    if (options.hostPort !== undefined && (!Number.isInteger(options.hostPort) || options.hostPort < 1024 || options.hostPort > 65535)) throw new Error("INVALID_SANDBOX_PORT");
    if (options.internalPort !== undefined && (!Number.isInteger(options.internalPort) || options.internalPort < 1024 || options.internalPort > 65535)) throw new Error("INVALID_SANDBOX_PORT");
    const publish = options.internalPort !== undefined ? [`--publish=127.0.0.1:${options.hostPort ?? ""}:${options.internalPort}`] : [];
    const network = options.preview ? PREVIEW_NETWORK_NAME : "none";
    // Always override the image entrypoint. The pinned sandbox image defaults to
    // `pnpm` with no command, which exits immediately; a platform-owned Node
    // keepalive gives the lifecycle a persistent runtime to supervise.
    const mount = options.workspacePath.startsWith("/") ? [] : ["--mount", `type=bind,source=${options.workspacePath},target=/workspace`];
    const args = ["run", "-d", `--network=${network}`, ...publish, ...mount, "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", `--memory=${options.memoryMb}m`, `--cpus=${options.cpuCount}`, "--pids-limit=128", "--tmpfs=/tmp:rw,noexec,nosuid,size=64m", "--tmpfs=/home/sandbox:rw,noexec,nosuid,size=64m", "--env=HOME=/tmp", "--entrypoint=node", "--", options.image, "-e", "setInterval(() => {}, 2147483647)"];
    return new Promise((resolve, reject) => {
      const child = spawn(this.docker, args, { stdio: ["ignore", "pipe", "pipe"] });
      let out = ""; let err = "";
      child.stdout.on("data", (d) => { out += String(d); }); child.stderr.on("data", (d) => { err += String(d); });
      child.once("error", reject); child.once("close", (code) => code === 0 && out.trim() ? resolve({ id: out.trim().split("\n")[0]!, status: "running" }) : reject(new Error(err ? "SANDBOX_RUNTIME_FAILED" : "SANDBOX_RUNTIME_UNAVAILABLE")));
    });
  }
  async stop(id: string): Promise<void> {
    if (!/^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id)) throw new Error("INVALID_RUNTIME_ID");
    await new Promise<void>((resolve, reject) => { const p = spawn(this.docker, ["rm", "-f", "--", id], { stdio: "ignore" }); p.once("error", reject); p.once("close", (c) => c === 0 ? resolve() : reject(new Error("SANDBOX_STOP_FAILED"))); });
  }
  async inspect(id: string): Promise<SandboxRuntime> {
    if (!/^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id)) throw new Error("INVALID_RUNTIME_ID");
    return this.run(["inspect", "--format", "{{.State.Status}}", "--", id]).then((status) => ({ id, status: status.trim() === "running" ? "running" : "stopped" }));
  }
  async start(id: string): Promise<SandboxRuntime> {
    if (!/^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id)) throw new Error("INVALID_RUNTIME_ID");
    await this.run(["start", "--", id]);
    return { id, status: "running" };
  }
  async inspectPublishedPort(id: string, containerPort = 4173): Promise<PublishedPort | null> { return inspectPublishedPort(id, containerPort); }
  async exec(id: string, command: SandboxRuntimeCommand, cwd = "/workspace"): Promise<SandboxExecResult> {
    if (!/^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id) || !/^\/?[a-zA-Z0-9._\\/: -]{1,256}$/.test(cwd)) throw new Error("INVALID_RUNTIME_INPUT");
    const argsByCommand: Record<SandboxRuntimeCommand, string[]> = {
      install: ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"],
      build: ["pnpm", "run", "build"],
      dev: ["node", "server.mjs"]
    };
    const args = ["exec", "-w", cwd, id, ...argsByCommand[command]];
    return new Promise((resolve, reject) => {
      const startedAt = new Date(); let truncated = false; let timedOut = false;
      const child = spawn(this.docker, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      const append = (target: "stdout"|"stderr", d: Buffer) => { const value = String(d); if (value.length > 262144) truncated = true; const clipped = value.length > 262144 ? value.slice(-262144) : value; if (target === "stdout") stdout += clipped; else stderr += clipped; };
      child.stdout.on("data", (d) => append("stdout", d));
      child.stderr.on("data", (d) => append("stderr", d));
      child.once("error", reject);
      child.once("close", (code) => { const finishedAt = new Date(); resolve({ exitCode: code ?? 1, stdout, stderr, timedOut, startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(), durationMs: finishedAt.getTime() - startedAt.getTime(), truncated }); });
    });
  }
  async startProcess(id: string, command: SandboxRuntimeCommand, cwd = "/workspace"): Promise<SandboxProcessRef> {
    if (!/^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id) || !/^\/?[a-zA-Z0-9._\\/: -]{1,256}$/.test(cwd)) throw new Error("INVALID_RUNTIME_INPUT");
    const argsByCommand: Record<SandboxRuntimeCommand, string[]> = { install: ["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"], build: ["pnpm", "run", "build"], dev: ["node", "server.mjs"] };
    const child = spawn(this.docker, ["exec", "-w", cwd, id, ...argsByCommand[command]], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", code: number | null = null;
    child.stdout.on("data", (d) => { stdout = (stdout + String(d)).slice(-262144); });
    child.stderr.on("data", (d) => { stderr = (stderr + String(d)).slice(-262144); });
    child.once("close", (c) => { code = c ?? 1; });
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { alive: () => code === null, stdout: () => stdout, stderr: () => stderr, exitCode: () => code, stop: () => { if (code === null) child.kill(); } };
  }
  async diagnose(id: string): Promise<SandboxRuntimeDiagnostics> {
    if (!/^[a-f0-9][a-f0-9_.-]{0,127}$/i.test(id)) throw new Error("INVALID_RUNTIME_ID");
    const script = "const fs=require('fs'); const listener=fs.readFileSync('/proc/net/tcp','utf8').split('\\n').some(x=>x.includes(':104D ')); Promise.resolve(fetch('http://127.0.0.1:4173/')).then(async r=>console.log(JSON.stringify({packageJson:fs.existsSync('/workspace/package.json'),lockfile:fs.existsSync('/workspace/pnpm-lock.yaml'),cwd:process.cwd(),user:require('os').userInfo().username,node:process.version,pnpm:'present',listener4173:listener,internalStatus:r.status}))).catch(e=>console.log(JSON.stringify({packageJson:fs.existsSync('/workspace/package.json'),lockfile:fs.existsSync('/workspace/pnpm-lock.yaml'),cwd:process.cwd(),user:require('os').userInfo().username,node:process.version,pnpm:'present',listener4173:listener,internalStatus:null,internalError:String(e.message)})))";
    const result = await this.runCapture(["exec", "-w", "/workspace", id, "node", "-e", script]);
    try { return JSON.parse(result.stdout.trim().split("\n").pop() ?? "{}"); } catch { return { packageJson: false, lockfile: false, cwd: "/workspace", user: "unknown", node: "unknown", pnpm: "unknown", listener4173: false, internalStatus: null, internalError: result.stderr.slice(-240) }; }
  }
  private run(args: string[]): Promise<string> { return new Promise((resolve, reject) => { const p = spawn(this.docker, args, { stdio: ["ignore", "pipe", "ignore"] }); let out = ""; p.stdout.on("data", (d) => { out += String(d); }); p.once("error", reject); p.once("close", (c) => c === 0 ? resolve(out) : reject(new Error("SANDBOX_RUNTIME_FAILED"))); }); }
  private runCapture(args: string[]): Promise<{stdout:string;stderr:string}> { return new Promise((resolve, reject) => { const p = spawn(this.docker, args, { stdio: ["ignore", "pipe", "pipe"] }); let stdout="",stderr=""; p.stdout.on("data",d=>stdout+=String(d)); p.stderr.on("data",d=>stderr+=String(d)); p.once("error",reject); p.once("close",()=>resolve({stdout,stderr})); }); }
}
