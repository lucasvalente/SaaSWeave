# Hermes Development Integration V2.5

Hermes (Nous Research) supervises planning, project memory, knowledge and QA locally; Codex executes code and commands. The bridge is file-based: Hermes writes `.hermes/tasks/`, Codex writes `.hermes/results/`, and Hermes reviews evidence before updating `state/project-state.json`.

On Windows, install/update with the official PowerShell installer, then run `hermes --help`. Configure provider/model through Hermes environment variables or its user-level config; never store API keys in this repository. Start Hermes manually only—no Windows service, daemon or scheduler is installed here.

The integration intentionally does not claim native Codex MCP support: `Codex integration: task/result bridge`.

## V2.5 workflow

Use `docs/agents/HERMES_ENGINEERING_SYSTEM_V2_5.md` as the normative operating contract. The orchestrator must read durable state before dispatch, create one bounded task per workstream, and require a result file with commands and exit codes before changing state. Specialists may work in parallel only when their permitted paths and dependencies do not overlap; validation and state updates remain ordered.

For every workstream:

1. audit the current filesystem and state;
2. dispatch the smallest executable task with explicit non-goals;
3. collect `.hermes/results/<task>.md` and review it against the task;
4. run applicable security, QA and release gates;
5. write a checkpoint or a complete state transition;
6. stop at scope and recommend the next workstream separately.

`blocked` requires concrete external evidence and three repeated checks of the same condition. Local failures remain actionable and must be fixed or recorded as pending with a resumable checkpoint.
