# Admin V1 Extended backlog

| Item                          | Priority | Dependencies                             | Status  | Acceptance criteria                                                 |
| ----------------------------- | -------- | ---------------------------------------- | ------- | ------------------------------------------------------------------- |
| Feature Flags UI refinement   | P1       | Feature API and audit                    | Backlog | Permissioned, audited changes are usable end-to-end.                |
| Advanced Settings UI          | P1       | Non-secret settings contract             | Backlog | Only approved non-secret settings are editable with audit evidence. |
| Sessions UI refinement        | P1       | Session APIs                             | Backlog | Server pagination, filters and bulk revoke have browser coverage.   |
| Audit log refinement          | P1       | Audit query API                          | Backlog | Actor/action/resource/workspace/date filters are server-side.       |
| Security events refinement    | P1       | Sanitized event API                      | Backlog | Type/severity/actor/date filters are server-side.                   |
| Health and metrics refinement | P1       | Existing health and Prometheus endpoints | Backlog | Dependency status is clear and secret-free.                         |
| Command palette               | P2       | Permission-aware navigation              | Backlog | Keyboard navigation exposes only permitted commands.                |
| Advanced global search        | P2       | Permission-aware search API              | Backlog | Bounded server-side results never expose inaccessible resources.    |
| Dashboard visual refinement   | P2       | Platform statistics                      | Backlog | Admin dashboard uses only real operational data.                    |
| Visual development seed       | P2       | Production guard                         | Backlog | Deterministic local seed hard-fails in production.                  |
