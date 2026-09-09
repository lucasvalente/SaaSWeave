# ADR: Project environment model

## Decision

No `project_environment` table is introduced in Project Administration V1 or Sandbox Preview V1.

Sandbox Preview V1 provides an ephemeral, snapshot-bound preview lifecycle through
`sandbox_session`; it is not a durable development or production environment.
The session records runtime state and an expiring loopback-only preview mapping.
Snapshots remain immutable and are never deleted by sandbox cleanup.

## Consequences

Future work must decide whether development and production are durable environments.
Any future environment table must be project-scoped, have a constrained environment
kind, and keep secrets as secret references. Preview execution remains isolated:
the application server invokes a narrow authenticated Runtime Controller and has no
Docker socket or Docker CLI authority. Project transfers remain future work because
they affect access, integrations, usage, billing, and deployments.
