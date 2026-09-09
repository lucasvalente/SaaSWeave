# Current state

Global Internationalization V1 foi concluída. O auditor local é `scripts/audit-hardcoded-ui.mjs`; a última execução encontrou apenas quatro exceções justificadas: tipo técnico `Promise`, marca `Vercel`, mensagem de rota de teste nunca renderizada e formato técnico `WebP`. A próxima workstream permanece para decisão do usuário; não iniciar automaticamente.

Regressão de locale runtime encerrada: o plugin Paraglide agora gera `saasweave_locale` e `saasweave.locale` diretamente. SSR validado no Docker rebuilt: cookie pt-BR/en/es renderiza o locale correspondente; cookie inválido e ausência de preferência usam pt-BR. Workstream `global-i18n-runtime-default-regression` concluída.

`plans-entitlements-v1` concluída com migration, API administrativa, RBAC, auditoria e telas de catálogo/detalhe. Próximo workstream recomendado: subscriptions, dependente do catálogo e dos entitlements agora estáveis; billing/checkout só depois dessa camada.

`subscriptions-v1` concluída com schema/migration, API administrativa list/get/history/assign/change/cancel, RBAC, histórico transacional, resolução de entitlements, UI administrativa localizada para atribuir e alterar planos, e gates finais verdes. Próximo workstream recomendado: usage-metering/credits; não iniciar automaticamente.

`usage-metering-credits-v1` concluída com catálogo/contratos de uso, eventos idempotentes append-only, agregação UTC, credit account/ledger transacional, limites de entitlements, admin Usage/Credits UI localizada, RBAC, auditoria, observabilidade e migrações de integridade. Próxima recomendação: Billing V1 somente após decisão explícita; não iniciar automaticamente.

`billing-v1` concluída com pricing imutável em minor units, perfis de cobrança, invoices com line-item snapshots e numeração determinística, pagamentos manuais parciais/idempotentes, refunds, lifecycle draft/open/paid/void, isolamento por tenant, RBAC/auditoria, admin billing UI (dashboard, invoices, detail, profile), migrações aplicadas e gates finais verdes. Escopo explicitamente sem gateways/checkout/automatic collection. Relatório: `BILLING_V1_REPORT.md`. Próxima recomendação: System Operations/Feature Flags antes do Builder Engine; não iniciar automaticamente.

`admin-navigation-consolidation` concluída: rotas administrativas reais auditadas, sidebar com RBAC para todos os módulos existentes, Admin Home com atalhos localizados, entry point do Super Admin e mapa em `docs/admin/SUPER_ADMIN_MAP.md`. TypeScript e build passaram; Playwright existente foi auditado e requer locale English no fixture legado para execução integral.
Admin root routing regression fixed: canonical `/admin/` direct access, refresh, Platform admin entry point and child routes validated by Playwright (2/2). Workstream `admin-root-routing-regression` complete; `admin-navigation-consolidation` remains complete.
