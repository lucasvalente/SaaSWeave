# ADR: Project usage foundation

## Decision

No new usage counter or event table is introduced in Project Administration V1.

The existing append-only usage architecture remains workspace-scoped. Future project-attributed usage must use an append-only event with `workspace_id`, `project_id`, metric, quantity, source, and timestamp; no synthetic usage is displayed in administration.
