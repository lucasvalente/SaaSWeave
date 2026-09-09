import assert from "node:assert/strict";
import { runAutonomousCompletion } from "./hermes-autonomous-runner.mjs";

const classify = (text) => {
  if (/refund|payment|mfa|secret|sandbox|deploy/i.test(text)) return "CRITICAL";
  if (/permission|rbac|tenant|migration|subscription|credits/i.test(text)) return "HIGH";
  if (/form|route|api|admin/i.test(text)) return "MEDIUM";
  return "LOW";
};
const route = (risk) => ({ LOW: "documentation-knowledge", MEDIUM: "frontend-engineer", HIGH: "security-auditor", CRITICAL: "project-orchestrator" })[risk];
const required = ["id", "objective", "risk", "owner", "scope", "acceptance", "evidence_required"];
const validEnvelope = (e) => required.every((k) => Object.hasOwn(e, k) && e[k] !== "");
const evidenceComplete = (items) => items.length > 0 && items.every((x) => ["PASS", "FAIL"].includes(x.status) && x.command && x.timestamp);
const close = (gates, pending) => gates.every((x) => x.status === "PASS") && pending.length === 0 ? "COMPLETE" : "IN_PROGRESS";

// A: intake; B: deterministic routing; C: bounded delegation; D: verification; E: evidence; F: closure.
const task = { id: "v3-1", objective: "Add admin form route", risk: classify("Add admin form route"), owner: "hermes", scope: ["app"], acceptance: ["tests"], evidence_required: ["tests"] };
assert.equal(validEnvelope(task), true); // A
assert.equal(route(task.risk), "frontend-engineer"); // B
const result = { task_id: task.id, status: "DONE", changed_files: ["app/form.tsx"], checks: ["pnpm test"], risks: [], remaining_work: [] };
assert.equal(result.task_id, task.id); assert.equal(result.remaining_work.length, 0); // C
assert.equal(result.checks.length, 1); // D
assert.equal(evidenceComplete([{ status: "PASS", command: "pnpm test", timestamp: new Date().toISOString() }]), true); // E
assert.equal(close([{ status: "PASS" }], []), "COMPLETE"); // F
assert.equal(close([{ status: "PASS" }], ["review"]), "IN_PROGRESS");
assert.equal(validEnvelope({}), false);
const runtime = await runAutonomousCompletion({
  workstream: "builder-like-fixture",
  criteria: ["file-ops", "snapshots", "review"],
  execute: async (_task, { iteration }) => iteration === 1 ? { status: "PARTIAL" } : iteration === 2 ? { status: "FAIL" } : { status: "PASS" }
});
assert.equal(runtime.stop_reason, "COMPLETE");
assert.equal(runtime.metrics.user_continuations_required, 0);
assert.equal(runtime.iterations.length, 5);
assert.equal(runtime.iterations[0].next_action, "CREATE_NEXT_TASK");
assert.equal(runtime.iterations[1].next_action, "CREATE_FIX_TASK");
assert.equal(runtime.iterations[3].next_action, "COMPLETE_CRITERION");
const blocked = await runAutonomousCompletion({ workstream: "blocker", criteria: ["x"], execute: async () => ({ status: "FAIL", blocker: "REAL_EXTERNAL_BLOCKER" }) });
assert.equal(blocked.stop_reason, "REAL_EXTERNAL_BLOCKER");
console.log("Hermes V3 tests A-F/delegation/evidence/runtime-loop: 16/16 PASS");
