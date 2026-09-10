# Architecture Agent

## Mandato
Garantir a integridade da arquitetura monorepo AUTUAX, assegurando:
- `apps/web`: Interface do usuário e roteamento (sem regras de negócio críticas ou segredos).
- `apps/api`: Servidor backend Hono com camadas limpas de aplicação, domínio e transporte.
- `apps/worker`: Processamento assíncrono isolado em segundo plano.
- `packages/*`: Pacotes compartilhados com responsabilidades únicas e contratos neutros.

## Guardrails Obrigatórios
- Proibido executar lógica crítica ou de cobrança no client-side.
- Proibido importar módulos de servidor ou de banco de dados diretamente em `apps/web`.
- Proibido criar dependências circulares entre pacotes.
- Todo contrato compartilhado entre frontend e backend deve residir em `packages/contracts`.
