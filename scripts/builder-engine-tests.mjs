import assert from "node:assert/strict";
import { normalizeProjectPath } from "../packages/api/src/builder/path-safety.ts";
import { developmentPlanner } from "../packages/api/src/builder/planner.ts";
import { runAutonomousCompletion } from "./hermes-autonomous-runner.mjs";

assert.equal(normalizeProjectPath("src/routes/index.tsx"), "src/routes/index.tsx");
for (const bad of ["../secret", "..\\secret", "/etc/passwd", "C:\\secret", "\\\\server\\share", "x\0y"]) assert.throws(() => normalizeProjectPath(bad));
const plan = await developmentPlanner.planProjectChange({}, "Create a dashboard");
assert.equal(plan.steps.length > 0, true);
const run = await runAutonomousCompletion({ workstream: "builder-engine-v1", criteria: ["file-operations", "snapshots", "security-review"], execute: async (_task, { iteration }) => iteration === 1 ? { status: "PARTIAL" } : iteration === 2 ? { status: "FAIL" } : { status: "PASS" } });
assert.equal(run.stop_reason, "COMPLETE");
assert.equal(run.metrics.user_continuations_required, 0);
console.log("Builder Engine targeted tests: PASS (path security, planner, autonomous continuation)");
