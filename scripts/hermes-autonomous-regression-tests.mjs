import assert from "node:assert/strict";
import { canReturnToUser, guardTerminalOutput, runAutonomousCompletion } from "./hermes-autonomous-runner.mjs";

const partial = { status: "PARTIAL", pending_criteria: ["snapshot-materialization"], blocker: null };
assert.equal(canReturnToUser(partial), false);
assert.deepEqual(guardTerminalOutput(partial), { allowed: false, next_action: "CREATE_NEXT_TASK" });
assert.equal(canReturnToUser({ status: "CHECKPOINT" }), false);
assert.equal(canReturnToUser({ status: "COMPLETE" }), true);

const runtime = await runAutonomousCompletion({
  workstream: "sandbox-preview-v1",
  criteria: ["snapshot", "health", "cleanup", "dogfood"],
  execute: async (_task, { iteration }) => ["PARTIAL", "CHECKPOINT", "TEST_FAILED", "PASS", "COMPLETE"][iteration - 1] ? { status: ["PARTIAL", "CHECKPOINT", "TEST_FAILED", "PASS", "COMPLETE"][iteration - 1] } : { status: "PASS" },
  maxIterations: 10,
});
assert.equal(runtime.metrics.user_continuations_required, 0);
assert.equal(runtime.stop_reason, "COMPLETE");
assert.ok(runtime.metrics.suppressed_non_terminal_outputs >= 3);
console.log("Hermes autonomous regression tests: PASS (non-terminal output guard; multi-iteration continuation)");
