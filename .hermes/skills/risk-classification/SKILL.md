# Risk Classification

Classify every task before implementation as LOW, MEDIUM, HIGH, or CRITICAL. Score security/auth/RBAC, tenant isolation, migrations, financial/credits, concurrency, secrets, integrations, execution, deployment, and UI/i18n/documentation factors. Emit JSON with `risk`, `reasons`, `required_agents`, `required_skills`, `required_reviews`, `required_tests`, and `required_gates`. Any discovered migration, RBAC, tenant, billing, auth, secret, sandbox, or deployment impact escalates risk and never removes mandatory safeguards.
