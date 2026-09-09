# Hermes Multi-Agent Engineering System V1

Hermes (Nous Research) supervises planning, memory, knowledge and QA locally. Codex executes edits, commands and evidence. The orchestrator routes bounded objectives to role playbooks under `.hermes/agents/`; official Hermes skills use `.hermes/skills/*/SKILL.md`.

`User → Orchestrator → specialist → task bridge → Codex → filesystem/tests/build → result bridge → review → state update`

## Agents

Project Orchestrator, Architect, Product Scope Guardian, Security Auditor, Frontend Engineer, Backend Engineer, Database Engineer, i18n Specialist, Testing/QA, Build/Release, Observability, Documentation/Knowledge, App Builder Architect, Sandbox/Execution Architect and Supabase Integration are defined under `.hermes/agents/`.

## Skills and workflows

Skills use Hermes official frontmatter and define purpose, inputs, process, evidence, output and failure conditions. Workflows cover feature, bug, security, database, i18n, refactor, release and interruption recovery.

## State and gates

`state/project-state.json` stores verified gates; `workstreams.json` prevents pending work being mistaken for complete; `decisions.json` records architecture choices. COMPLETE requires applicable tests, audits, typecheck, build/prerender, security, Playwright, Docker and dependency evidence.

## Interruption and guardrails

Record `last_directory`, `last_file`, `completed_items`, `pending_items`, `audit_before`, `audit_after` and `gates_run`, then resume from that checkpoint. Never invent evidence, expose secrets, replace canonical technology arbitrarily, weaken tenant isolation/MFA/RBAC, perform destructive operations without approval, or broaden scope. No autonomous daemon is installed.

## Future specialists

App Builder and Sandbox playbooks are conceptual only; they do not implement Builder, Sandbox, Billing, OAuth, Preview, GitHub or Deploy.

## Hermes/Codex

Codex remains the executor. `Codex integration: task/result bridge`; there is no native Codex MCP claim.
