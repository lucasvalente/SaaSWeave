import { randomUUID } from "node:crypto";

export const TERMINAL = new Set(["COMPLETE", "REAL_EXTERNAL_BLOCKER", "USER_APPROVAL_REQUIRED", "PRODUCTION_SAFETY_BOUNDARY", "EXPLICIT_USER_APPROVAL_REQUIRED", "IRREVERSIBLE_PRODUCTION_ACTION_REQUIRED"]);

/** Canonical terminal-output policy. Non-terminal execution states never escape to the user. */
export function canReturnToUser(state = {}) {
  const stopReason = state.stop_reason ?? state.status;
  if (!TERMINAL.has(stopReason)) return false;
  return stopReason === "COMPLETE" || stopReason === "REAL_EXTERNAL_BLOCKER" || stopReason === "USER_APPROVAL_REQUIRED" || stopReason === "PRODUCTION_SAFETY_BOUNDARY";
}

export function guardTerminalOutput(state = {}) {
  if (state.pending_criteria?.length && !state.blocker && !canReturnToUser(state)) return { allowed: false, next_action: "CREATE_NEXT_TASK" };
  return { allowed: canReturnToUser(state), next_action: canReturnToUser(state) ? "RETURN_TO_USER" : "CREATE_NEXT_TASK" };
}

/** Execute local work until completion or an explicitly classified terminal boundary. */
export async function runAutonomousCompletion({ workstream, criteria, execute, maxIterations = 25, state = {} }) {
  const ledger = { ...state, phase: "EXECUTION", stop_reason: null, pending_criteria: [...criteria], passed_criteria: [], iterations: [], metrics: { autonomous_iterations: 0, automatic_followup_tasks: 0, automatic_fix_tasks: 0, auto_resumed_checkpoints: 0, suppressed_non_terminal_outputs: 0, non_terminal_user_outputs: 0, partial_results_continued: 0, review_fix_cycles: 0, dogfood_fix_cycles: 0, user_continuations_required: 0 } };
  for (let i = 1; i <= maxIterations; i++) {
    ledger.metrics.autonomous_iterations = i;
    if (ledger.pending_criteria.length === 0) { ledger.phase = "FINAL_GATES"; ledger.stop_reason = "COMPLETE"; break; }
    const criterion = ledger.pending_criteria[0];
    const task = { id: randomUUID(), workstream, criterion, phase: "EXECUTION" };
    const result = await execute(task, { iteration: i, ledger });
    const action = result.blocker ? "BLOCK" : result.status === "PASS" ? "COMPLETE_CRITERION" : result.reviewFinding || result.status === "FAIL" ? "CREATE_FIX_TASK" : "CREATE_NEXT_TASK";
    if (!result.blocker && result.status !== "PASS") {
      ledger.metrics.suppressed_non_terminal_outputs++;
      if (result.status === "CHECKPOINT" || result.status === "EXECUTION_CHECKPOINT") ledger.metrics.auto_resumed_checkpoints++;
      if (result.status === "PARTIAL" || result.status === "IN_PROGRESS") ledger.metrics.partial_results_continued++;
    }
    ledger.iterations.push({ iteration: i, task_id: task.id, criterion, result: result.status, next_action: action });
    if (result.blocker) { ledger.stop_reason = result.blocker; ledger.phase = "BLOCKED"; break; }
    if (result.status === "PASS") { ledger.passed_criteria.push(criterion); ledger.pending_criteria.shift(); if (ledger.pending_criteria.length) ledger.metrics.automatic_followup_tasks++; }
    else if (result.reviewFinding || result.status === "FAIL") ledger.metrics.automatic_fix_tasks++;
    else ledger.metrics.automatic_followup_tasks++;
  }
  if (!ledger.stop_reason) ledger.stop_reason = ledger.pending_criteria.length ? "LOCAL_EXECUTION_CONTINUES" : "COMPLETE";
  if (ledger.stop_reason === "COMPLETE") ledger.phase = "COMPLETE";
  return ledger;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  const result = await runAutonomousCompletion({
    workstream: "hermes-v3-runtime-fixture",
    criteria: ["create-file", "fix-test", "review-finding"],
    execute: async (_task, { iteration }) => iteration === 1 ? { status: "PARTIAL" } : iteration === 2 ? { status: "FAIL" } : iteration === 3 ? { status: "PASS" } : { status: "PASS" }
  });
  console.log(JSON.stringify(result, null, 2));
}
