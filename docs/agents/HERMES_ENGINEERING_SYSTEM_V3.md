# Hermes Engineering System V3 — Execution Excellence

V3 extends V2.5 without replacing its risk, impact, regression, failure-memory, routing, ownership, safety and completion-gate policies.

## Execution contract

Work proceeds through UNDERSTAND, PLAN, IMPLEMENT, TEST, FIX, REVIEW, DOGFOOD, PROVE and COMPLETE. `EXECUTION_MODE` is entered when local work is actionable; discovery is not repeated without new evidence. Checkpoints persist resumable state and are not user-facing completion.

### Autonomous Completion Runtime

`scripts/hermes-autonomous-runner.mjs` connects task/result evaluation to follow-up execution. A partial result yields `CREATE_NEXT_TASK`; a failed test or review finding yields `CREATE_FIX_TASK`; only an empty pending set yields `COMPLETE`. Terminal stop reasons are restricted to completion, real external blocker, explicit approval, or irreversible production safety. Iteration limits and metrics prevent infinite loops, while `user_continuations_required` remains zero for local work.

## Readiness and evidence

Definition of Ready records goal, acceptance, risk, impact, dependencies, ownership, invariants, test/review/gate plans. Acceptance contracts are executable. Evidence ledger entries identify the command, route or test supporting each PASS. Quality scores are gate-based and mandatory gates cannot be hidden by averages.

## Safety and feedback loops

Only real external blockers stop execution. Failed tests, fixtures, missing endpoints, migrations, permissions, translations and review findings are local work. Findings and dogfood failures create fix tasks and targeted reruns. Repeated pending criteria trigger circular/stagnation detection and force execution. Security, database, performance, UI and ownership policies remain risk-routed.

## Schemas and validation

Codex V3 tasks/results carry phase, risk, goal, acceptance contract, impact, dependencies, ownership, budget, invariants, tests, review, dogfood, gates, evidence, failures, blockers and checkpoint. `scripts/hermes-v3-tests.mjs` validates execution, blocker, circular and evidence scenarios.
