import assert from "node:assert/strict";
import { executeCodexTask } from "./hermes-codex-executor.mjs";
assert.equal(typeof executeCodexTask, "function");
await assert.rejects(() => executeCodexTask({}), /INVALID_HERMES_TASK_ENVELOPE/);
console.log("Hermes Codex executor contract: PASS");
