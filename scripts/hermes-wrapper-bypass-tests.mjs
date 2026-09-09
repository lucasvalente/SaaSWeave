import assert from "node:assert/strict";
import { emitPublicResponse } from "./hermes-run.mjs";

let writes = 0;
const candidate = "workstream continues running; not enough evidence for COMPLETE";
const suppressed = emitPublicResponse({ status: "IN_PROGRESS", pending_criteria: ["health"], blocker: null }, candidate, () => { writes++; });
assert.equal(suppressed.status, "SUPPRESSED");
assert.equal(suppressed.next_action, "CREATE_NEXT_TASK");
assert.equal(suppressed.public_output_count, 0);
assert.equal(writes, 0);
const emitted = emitPublicResponse({ status: "COMPLETE" }, "COMPLETE", () => { writes++; });
assert.equal(emitted.public_output_count, 1);
assert.equal(writes, 1);
console.log("Hermes wrapper output guard: PASS (non-terminal candidate suppressed; terminal emitted once)");
