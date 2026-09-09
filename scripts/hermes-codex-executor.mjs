import { spawn } from "node:child_process";

/** Inline Codex bridge used by the autonomous runtime. The task envelope is passed as structured JSON on stdin. */
export async function executeCodexTask(task, { cwd = process.cwd(), timeoutMs = 1_800_000, signal, executable = "codex", executableArgs } = {}) {
  if (!task?.workstream_id || !task.criterion_id) throw new Error("INVALID_HERMES_TASK_ENVELOPE");
  const prompt = `Execute Hermes task ${task.task_id} for workstream ${task.workstream_id}. Criterion: ${task.criterion_id}. Objective: ${task.objective}. Return a structured result with status, changed_files, tests, evidence, and pending_work. Do not modify files outside the allowed scope.`;
  return new Promise((resolve, reject) => {
    const child = spawn(executable, executableArgs ?? ["exec", "--skip-git-repo-check", "--sandbox", "workspace-write", "-C", cwd, prompt], { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    let settled = false;
    const finish = (value, error) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener("abort", abort); error ? reject(error) : resolve(value); };
    const killTree = () => { if (process.platform === "win32" && child.pid) spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }); else child.kill("SIGKILL"); };
    const abort = () => { killTree(); finish({ status: "CHECKPOINT", changed_files: [], tests: [], evidence: [], pending_work: [], error: "EXECUTOR_ABORTED" }); };
    const timer = setTimeout(() => { killTree(); finish({ status: "CHECKPOINT", changed_files: [], tests: [], evidence: [{ command: "codex exec", output: stdout.slice(-4000) }], pending_work: [], error: "EXECUTOR_TIMEOUT" }); }, timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    child.once("error", (error) => finish(undefined, error));
    child.once("close", (code) => finish({ status: code === 0 ? "PASS" : "FAILED", changed_files: [], tests: [], evidence: [{ command: "codex exec", output: stdout.slice(-4000) }], pending_work: [], error: code === 0 ? undefined : stderr.slice(-2000) }));
  });
}
