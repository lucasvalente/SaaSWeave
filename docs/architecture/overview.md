# Control Plane architecture

## Scope

This repository is the Control Plane: identity, workspaces, administration, policy, audit, security state, configuration, queues and operational status. It must never evaluate, build or execute customer-generated code.

```text
Internet -> Admin Web -> API -> PostgreSQL
                           |-> Redis/BullMQ -> Scheduler/Control workers
                           |-> Object storage
                           `-> telemetry pipeline

Future, separate trust domain:
API -> execution dispatch contract -> Agent Worker -> Sandbox
```

The future dispatch contract may contain an immutable run ID, workspace ID, artifact references, policy profile and deadlines. It must not contain control-plane database credentials, Redis credentials or raw platform secrets.

## Current-to-target mapping

| Current                            | Target responsibility                                |
| ---------------------------------- | ---------------------------------------------------- |
| `apps/web`                         | `apps/admin-web` after phase-one surface isolation   |
| `apps/server` + `packages/api`     | `apps/api` host and typed API contracts              |
| schedule code in `apps/worker`     | dedicated `apps/scheduler`; control jobs only        |
| `packages/auth`                    | session and identity plumbing                        |
| role helpers across auth/API       | `packages/permissions` policy engine                 |
| `packages/db` audit functions      | `packages/audit` domain plus insert-only persistence |
| security code in core/cache/server | `packages/security` and `packages/rate-limit`        |
| `packages/env`                     | `packages/config` with environment separation        |
| `packages/jobs`                    | `packages/queue` contracts and workers               |

## Invariants

- Backend authorization is mandatory; navigation visibility is not authorization.
- Tenant resources are addressed by `(workspace_id, resource_id)` and repository APIs require tenant context.
- Privileged mutations require authentication, permission, validated input and audit evidence.
- Secrets cross boundaries only by opaque reference; browsers never receive raw secret material.
- Health is public/minimal; readiness and metrics expose no credentials and metrics are internal or authenticated.
- Execution Plane uses separate identities, networks, storage and data access.
