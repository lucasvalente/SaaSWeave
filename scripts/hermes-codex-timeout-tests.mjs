import assert from "node:assert/strict";
import { executeCodexTask } from "./hermes-codex-executor.mjs";
const started = Date.now();
const result = await executeCodexTask({ workstream_id: "timeout-fixture", criterion_id: "hang" }, { executable: process.execPath, executableArgs: ["-e", "setInterval(() => {}, 1000)"], timeoutMs: 100 });
assert.equal(result.status, "CHECKPOINT");
assert.equal(result.error, "EXECUTOR_TIMEOUT");
assert.ok(Date.now() - started < 3000);
console.log("Codex executor timeout proof: PASS (structured timeout result, bounded process lifetime)");
