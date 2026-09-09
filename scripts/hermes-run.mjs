import { canReturnToUser, guardTerminalOutput, runAutonomousCompletion } from "./hermes-autonomous-runner.mjs";
import { pathToFileURL } from "node:url";
import { loadPersistedWorkstream } from "./hermes-workstream-loader.mjs";
import { executeCodexTask } from "./hermes-codex-executor.mjs";
import { appendFile, mkdir } from "node:fs/promises";

/** Public Hermes V3 entrypoint: all normal workstreams execute autonomously until terminal. */
export async function runHermesWorkstream({ workstream, criteria, execute, state }) {
  const result = await runAutonomousCompletion({ workstream, criteria, execute, state });
  const gate = guardTerminalOutput({ ...result, status: result.stop_reason, blocker: result.stop_reason === "REAL_EXTERNAL_BLOCKER" ? result.stop_reason : null });
  if (!canReturnToUser({ status: result.stop_reason }) || !gate.allowed) {
    return { terminal: false, emit: false, nextAction: "CONTINUE", stop_reason: result.stop_reason, state: result, metrics: result.metrics };
  }
  return { terminal: true, stop_reason: result.stop_reason, user_output: result, metrics: result.metrics };
}

/** The only public emitter for Hermes workstream results. */
export function HermesPublicTerminalOutput(result, write = (value) => process.stdout.write(`${value}\n`)) {
  if (!result?.terminal || !canReturnToUser({ status: result.stop_reason })) throw new Error("HERMES_PUBLIC_OUTPUT_REQUIRES_TERMINAL");
  write(JSON.stringify(result));
}

/** External caller boundary: candidate summaries are suppressed unless the persisted state is terminal. */
export function emitPublicResponse(state, candidate, write = (value) => process.stdout.write(`${value}\n`)) {
  const terminal = canReturnToUser(state);
  if (!terminal) return { status: "SUPPRESSED", next_action: "CREATE_NEXT_TASK", public_output_count: 0, attempted_non_terminal_public_outputs: 1, message: candidate };
  write(typeof candidate === "string" ? candidate : JSON.stringify(candidate));
  return { status: "EMITTED", public_output_count: 1, attempted_non_terminal_public_outputs: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const id = process.env.HERMES_WORKSTREAM;
  if (!id) throw new Error("WORKSTREAM_REQUIRED");
  const loaded = await loadPersistedWorkstream(id);
  let executorInvocations = 0;
  const result = await runHermesWorkstream({
    workstream: loaded.id,
    criteria: loaded.pending_criteria,
    state: loaded,
    execute: async (task) => {
      if (task.workstream !== loaded.id) return { status: "FAILED", error: "WORKSTREAM_ID_MISMATCH" };
      executorInvocations++;
      const envelope = { task_id: task.id, workstream_id: loaded.id, criterion_id: task.criterion, objective: `Implement and validate criterion ${task.criterion}`, risk: "CRITICAL", specialist: "sandbox-execution-architect", skills: ["security-review", "targeted-completion-gates"], allowed_scope: ["packages/api/src/sandbox", "packages/db/src/schema", "packages/db/migrations", "apps/web/src"], file_ownership: ["sandbox-preview-v1"], acceptance: [task.criterion], context_refs: [".hermes/state/project-state.json", ".hermes/state/evidence-ledger.json"], evidence_requirements: ["targeted tests", "security evidence"] };
      const taskResult = await executeCodexTask(envelope);
      await mkdir(".hermes/results", { recursive: true });
      await appendFile(`.hermes/results/sandbox-preview-v1-runtime.jsonl`, `${JSON.stringify({ task: envelope, result: taskResult, at: new Date().toISOString() })}\n`);
      return taskResult;
    },
  });
  result.metrics.codex_invocations = executorInvocations;
  if (!result.terminal) {
    process.stderr.write(`Hermes internal continuation scheduled for ${loaded.id}\n`);
    // Keep the invocation alive; suppression is an internal continuation event, never completion.
    await new Promise((resolve) => { setInterval(resolve, 2 ** 31 - 1); });
  }
  else HermesPublicTerminalOutput(result);
}
