import assert from "node:assert/strict";
import { runHermesWorkstream } from "./hermes-run.mjs";

let terminalUserOutputs = 0;
const result = await runHermesWorkstream({
  workstream: "fake-builder",
  criteria: ["A", "B", "C"],
  execute: async (_task, { iteration }) => [{ status: "PASS" }, { status: "IN_PROGRESS" }, { status: "CHECKPOINT" }, { status: "PASS" }, { status: "PASS" }][iteration - 1] ?? { status: "PASS" },
});
if (result.stop_reason === "COMPLETE") terminalUserOutputs++;
assert.equal(result.stop_reason, "COMPLETE");
assert.equal(terminalUserOutputs, 1);
assert.equal(result.metrics.user_continuations_required, 0);
assert.ok(result.metrics.non_terminal_user_outputs === undefined || result.metrics.non_terminal_user_outputs === 0);
console.log("Hermes public entrypoint integration: PASS (terminal_user_outputs=1, non_terminal_user_outputs=0)");
