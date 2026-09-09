import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const run = spawnSync(process.execPath, ["scripts/hermes-run.mjs"], { encoding: "utf8" });
assert.equal(run.status, 0);
assert.equal(run.stderr, "");
const lines = run.stdout.trim().split(/\r?\n/);
assert.equal(lines.length, 1);
const output = JSON.parse(lines[0]);
assert.equal(output.terminal, true);
assert.equal(output.stop_reason, "COMPLETE");
assert.equal(output.stop_reason, "COMPLETE");
assert.equal(output.user_output.iterations.some((item) => ["IN_PROGRESS", "PARTIAL", "CHECKPOINT", "TEST_FAILED", "REVIEW_FINDING"].includes(item.result)), false);
console.log("Hermes CLI output separation: PASS (public_non_terminal_outputs=0, public_terminal_outputs=1)");
