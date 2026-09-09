import { spawn } from "node:child_process";

/** Commands exposed to a sandbox. Raw shell commands are intentionally not supported. */
export const SANDBOX_COMMANDS = ["install", "build", "dev", "test"] as const;
export type SandboxCommand = (typeof SANDBOX_COMMANDS)[number];

export type SandboxCommandRequest = {
  command: SandboxCommand;
  args?: readonly string[];
  cwd: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

export type SandboxCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

const COMMAND_ARGS: Record<SandboxCommand, readonly string[]> = {
  install: ["install", "--frozen-lockfile", "--ignore-scripts"],
  build: ["run", "build"],
  dev: ["run", "dev"],
  test: ["run", "test"],
};
const SAFE_CWD = /^[a-zA-Z0-9._\\/: -]{1,260}$/;
const SAFE_ARG = /^[a-zA-Z0-9._/@:=+,-]{1,160}$/;
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;
const DEFAULT_OUTPUT_BYTES = 256 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;

function validate(request: SandboxCommandRequest): void {
  if (!SANDBOX_COMMANDS.includes(request.command)) throw new Error("SANDBOX_COMMAND_NOT_ALLOWED");
  if (!SAFE_CWD.test(request.cwd)) throw new Error("INVALID_SANDBOX_WORKSPACE");
  const args = request.args ?? [];
  if (args.length > 16 || args.some((arg) => !SAFE_ARG.test(arg) || arg.includes(".."))) {
    throw new Error("INVALID_SANDBOX_ARGUMENTS");
  }
  if (request.timeoutMs !== undefined && (!Number.isInteger(request.timeoutMs) || request.timeoutMs < 1 || request.timeoutMs > MAX_TIMEOUT_MS)) {
    throw new Error("INVALID_SANDBOX_TIMEOUT");
  }
  if (request.maxOutputBytes !== undefined && (!Number.isInteger(request.maxOutputBytes) || request.maxOutputBytes < 1024 || request.maxOutputBytes > MAX_OUTPUT_BYTES)) {
    throw new Error("INVALID_SANDBOX_OUTPUT_LIMIT");
  }
}

export function executeSandboxCommand(request: SandboxCommandRequest): Promise<SandboxCommandResult> {
  validate(request);
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = request.maxOutputBytes ?? DEFAULT_OUTPUT_BYTES;
  const args = [...COMMAND_ARGS[request.command], ...(request.args ?? [])];

  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, { cwd: request.cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let timedOut = false;
    const append = (target: "stdout" | "stderr", chunk: Buffer): void => {
      if (outputBytes >= maxOutputBytes) return;
      const remaining = maxOutputBytes - outputBytes;
      const text = chunk.subarray(0, remaining).toString("utf8");
      outputBytes += Buffer.byteLength(text);
      if (target === "stdout") stdout += text;
      else stderr += text;
    };
    child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr, timedOut });
    });
  });
}
