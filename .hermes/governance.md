# Hermes change governance

Every non-trivial workstream records risk before implementation and impact after the change. Risk is based on the highest affected boundary:

| Level | Boundary | Required evidence |
| --- | --- | --- |
| low | documentation, isolated UI copy | targeted checks and diff review |
| medium | shared UI, routing, non-sensitive API | typecheck, relevant tests, build |
| high | auth, RBAC, tenant isolation, mutations | security review, integration tests, Playwright where applicable, build |
| critical | production data, migrations, release/deploy | migration review, rollback evidence, security and release gates |

Impact analysis must name affected routes/packages, preserved invariants, and a reversible rollback. A regression map entry links the observed symptom to its source boundary, impacted surfaces, risk, and verification commands. An entry may be `mitigated` only after the listed evidence is available; `accepted` requires an explicit decision record.

Machine-readable contracts live in `.hermes/schemas/change-risk.schema.json` and `.hermes/schemas/regression-map.schema.json`. The current map is `.hermes/state/regression-map.json`.
