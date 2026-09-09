# Hermes Engineering System V2.5

Hermes is the local engineering control plane for this repository. It provides durable project memory, bounded workstream orchestration, specialist role contracts, evidence review, and release gates. It is not part of the SaaS runtime and must never be bundled or deployed with the product.

## Operating model

```text
request → orchestrator → state/dependency audit → bounded task
       → specialist execution → evidence result → independent review
       → gates → state transition → next task or recommendation
```

Codex is the executor: it edits the workspace, runs tests and records factual evidence. Hermes is the supervisor: it selects work, enforces scope and validates completion. A workstream is complete only after all applicable gates pass; an unfinished local task is not `blocked`.

## Durable state

Before dispatch, read:

- `.hermes/state/project-state.json` — current workstream, completed work and gates;
- `.hermes/state/workstreams.json` — lifecycle and ownership of workstreams;
- `.hermes/state/decisions.json` — architectural decisions and constraints;
- `.hermes/project-context.md`, `.hermes/architecture.md`, `.hermes/rules.md` — repository context and safety rules.

Tasks are stored in `.hermes/tasks/`; executor evidence is stored in `.hermes/results/`. State updates must include the task id, files changed, commands, exit codes, test counts, remaining scope and a resumable checkpoint (`last_directory`, `last_file`, `pending_items`).

## Workstream lifecycle

`planned → ready → in_progress → validation → complete` is the normal path. Use `blocked` only for a repeated, evidenced external dependency that cannot be resolved locally (for example an unavailable mandatory service or credential). A failed test, missing fixture, migration or local build issue is an engineering task to investigate and fix.

Every task has a single objective, explicit non-goals, permitted paths, required gates and an owner. The orchestrator must not silently expand a task into a new domain. Completed workstreams remain complete; regressions are recorded as separate regression workstreams linked to the original.

## Role contracts

Specialists use the playbooks in `.hermes/agents/`:

- `project-orchestrator`: decomposes, sequences, checkpoints and closes work;
- `architect`: checks boundaries, dependency direction and decisions;
- `frontend-engineer` / `backend-engineer` / `database-engineer`: implement within the assigned layer;
- `security-auditor`: verifies fail-closed authorization, isolation, secrets and threat regressions;
- `testing-qa`: defines and runs focused plus regression tests;
- `build-release`: runs reproducible typecheck, lint, build, Docker and dependency gates;
- `documentation-knowledge`: updates reports, maps and durable operational knowledge.

No specialist may claim another role's gate. Security and release evidence is independently reviewable, and documentation records facts rather than inferred success.

## Evidence and gates

Results use the fields defined by `.hermes/workflows/review-codex-result.md`: scope, files, commands, exit status, observations, security notes, test evidence and pending items. Never include passwords, tokens, cookies, authorization headers, TOTP secrets or raw session data.

Applicable gates include typecheck, lint/static analysis, unit/integration tests, Playwright, message parity, security/tenant isolation, build/prerender, Docker health, dependency audit and `git diff --check`. Missing tests are reported as not applicable, never fabricated. A release claim must identify the exact command and result.

## Interruption and resumption

On timeout or interruption, write a checkpoint before stopping. The next task resumes from the last confirmed directory/file and reruns only the necessary audit before continuing. Do not restart completed areas or mark completion from a partial result. Preserve user changes and avoid destructive repository operations.

## Scope and safety

Hermes does not publish, deploy, alter DNS, access external secrets, run destructive migrations or install daemons autonomously. External services are used only when explicitly in scope. Product code must not import Hermes runtime code. RBAC, MFA, tenant isolation, audit semantics, API names and internal identifiers are preserved unless the task explicitly changes them with security review.

## Completion record

On completion, update `project-state.json`, `workstreams.json` and the relevant report. Include the final gate matrix, evidence paths and any justified technical exceptions. Then stop at the requested boundary and recommend (but do not implement) the next workstream.
