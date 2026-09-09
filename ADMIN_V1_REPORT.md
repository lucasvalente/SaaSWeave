# Admin V1 — relatório de validação

Status: Admin V1 Core: STABLE

Admin V1 Extended: BACKLOG

Escopo: o núcleo administrativo está congelado para permitir o início do Project Control Plane. Refinamentos secundários estão documentados em `docs/backlog/admin-v1-extended.md` e não bloqueiam a plataforma.

## Requisitos e evidências

| REQUIREMENT                    | STATUS   | EVIDENCE                                                                                                                                                                                                                                                                  |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrato env e ImportMeta.env  | COMPLETE | `packages/env/src/web/env.isomorphic.ts:1` referencia `vite/client`; schema Zod contém somente variáveis públicas. Contratos server continuam usando `process.env`. Typecheck isolado passou.                                                                             |
| Typecheck global               | COMPLETE | `pnpm typecheck` passou em todos os packages com código. Configs locais adicionados a permissions, security, secrets e vite-plus; somente o package de configuração tsconfig é excluído da execução recursiva.                                                            |
| Build SSR sem .env obrigatório | COMPLETE | `pnpm build` passou, com 17 páginas prerenderizadas e sem `packages/env/.env`. SSR utiliza transporte HTTP para a API em runtime; prerender não chama serviços privados.                                                                                                  |
| Users SQL e validação          | COMPLETE | `admin-users.integration.test.ts`: 4 casos, incluindo seis combinações de filtros, busca, MFA, status, role via EXISTS, ordenação createdAt asc/desc, desempate por ID, paginação e limites. Rejeita 101, negativo, cursor inválido e sort password/random_sql/**proto**. |
| Users UI                       | COMPLETE | Busca, status, role, MFA, ordenação e paginação enviadas à API; loading, vazio e erro; navegação para detalhe. Playwright Admin.                                                                                                                                          |
| User Detail                    | COMPLETE | Detalhe existente preservado e navegação integrada. Nenhum token de sessão retornado pela projeção. Playwright Admin.                                                                                                                                                     |
| Workspaces                     | COMPLETE | Busca SQL por nome/owner, filtro de status, cursor validado, lista e detalhe com owner/members/roles/audit conforme permissões. `admin-workspaces.integration.test.ts` e Playwright Admin.                                                                                |
| Tenant isolation               | COMPLETE | `admin-tenant-isolation.integration.test.ts`: A pode ler/mutar A; detalhe de B e revogação de chave de B negados; tentativa de activeOrganizationId forjado não revela B. Browser também nega administração de workspace estrangeiro a usuário comum.                     |
| Permission matrix              | COMPLETE | `admin-permissions.integration.test.ts`: seis roles, nove módulos, leituras permitidas/negadas e escritas permitidas/negadas. Busca global também validada por permissões.                                                                                                |
| Roles                          | COMPLETE | Catálogo de permissões, atribuições persistidas, concessão privilegiada com step-up, proteção do último super_admin e revogação das sessões do alvo. Suítes existentes de autorização/TOTP e Playwright MFA.                                                              |
| Sessions                       | COMPLETE | Filtros SQL por email, estado e MFA; paginação, revoke e revokeAll, confirmação na UI e auditoria. Projeção não inclui token. Matriz de permissões, integrações e revogação no browser.                                                                                   |
| Audit                          | COMPLETE | Filtros SQL actor/action/resource/workspace/date range, paginação e intervalo validado. `admin-events.integration.test.ts` e browser.                                                                                                                                     |
| Security Events                | COMPLETE | Filtros SQL type/severity/actor/date; redaction preservada e testada; estados de UI. `admin-events.integration.test.ts` e browser.                                                                                                                                        |
| Feature Flags                  | COMPLETE | `/admin/feature-flags`; leitura/escrita com permissões específicas e auditoria. Matriz e integrações existentes.                                                                                                                                                          |
| Settings                       | COMPLETE | `/admin/settings`; schema somente de configurações não secretas; permissões distintas de leitura/escrita. Matriz testa concessões e recusas; browser testa acesso negado.                                                                                                 |
| Health                         | COMPLETE | `/admin/system/health`; probes reais de Postgres, Redis, queue e storage, limite de espera e estados unhealthy/unconfigured. API reporta execução do handler. Browser e Docker health.                                                                                    |
| Metrics                        | COMPLETE | Prometheus mantém requests, duração/status/errors, auth failures, rate limits e queue health; contador admin mutations distingue escritas das leituras POST. Testes de observability passaram.                                                                            |
| Dashboard                      | COMPLETE | Contagens SQL reais para users, workspaces, sessões ativas, audit e eventos críticos; saúde real dos serviços; dados ocultados conforme permissão. Estimativas antigas removidas da página.                                                                               |
| Global Search                  | COMPLETE | `admin.search` consulta SQL bounded de users/workspaces, condicionada às respectivas permissões; matriz e browser.                                                                                                                                                        |
| Command Palette                | COMPLETE | Ctrl/Cmd+K, navegação e busca; grupos/comandos filtrados pelas permissões efetivas. Browser valida ausência de Settings para support.                                                                                                                                     |
| Dev Seed                       | COMPLETE | Seed local idempotente cria seis roles, usuários A/B, dois workspaces e eventos. Execução development passou; production falhou antes de importar DB/auth.                                                                                                                |

## Diagnóstico TypeScript

O acesso estava no contrato isomórfico `packages/env/src/web/env.isomorphic.ts`, em `runtimeEnv: import.meta.env ?? process.env`. O tipo esperado é o `ImportMetaEnv` oficial do Vite; o `ImportMeta` padrão de TypeScript/Node não fornece `env`. O contrato é consumido por projetos diferentes, portanto depender apenas dos tipos globais do frontend não resolve todos os programas TypeScript.

A referência local a `vite/client` acompanha esse contrato público. O schema continua centralizado em `createEnv`/Zod. Não foram adicionados `any`, casts de ImportMeta, `@ts-ignore` ou secrets VITE. Os contratos exclusivos de servidor continuam independentes desse acesso.

Os erros seguintes vinham de packages sem tsconfig local: a execução recursiva herdava o programa raiz NodeNext e verificava arquivos de outros projetos no contexto errado. Foram adicionados os tsconfigs locais necessários e corrigidas dependências de tipos/imports de testes. O filtro global exclui apenas `@saasweave/tsconfig`, que contém configuração e não código de aplicação.

## Quality gate

| Gate               | Resultado                                            | Evidência local                                                                                                         |
| ------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Env isolado        | PASS                                                 | `work/admin-v1-env-typecheck.log`                                                                                       |
| TypeScript global  | PASS                                                 | `work/admin-v1-typecheck.log`                                                                                           |
| Lint/static/format | PASS: 0 erros, 43 warnings                           | `work/admin-v1-static.log`; `pnpm exec vp check --fix`                                                                  |
| Unit               | PASS: 794/794, 20 pacotes                            | `work/admin-v1-unit.log`; `pnpm test:unit:run`                                                                          |
| Integration        | PASS: 138/138, 36 arquivos                           | `work/admin-v1-integration-all.log`                                                                                     |
| Security           | PASS                                                 | Packages permissions/security/secrets/observability e testes de autorização, TOTP, sessões e redaction nas suítes acima |
| Permission matrix  | PASS: 6/6                                            | Testes dos seis perfis, nove módulos e mutações                                                                         |
| Tenant isolation   | PASS                                                 | Read/detail/mutation/IDOR e contexto ativo forjado                                                                      |
| Playwright MFA     | PENDING_FINAL_BROWSER                                | Suíte existente de nove casos, sem novos cenários MFA                                                                   |
| Playwright Admin   | PASS: 3/3                                            | Suíte de três fluxos com dez operações/restrições solicitadas e Dashboard/Health/search                                 |
| Build              | PASS                                                 | `work/admin-v1-build.log`; 17 páginas prerenderizadas                                                                   |
| Docker             | PASS: server/web/worker/Postgres/Redis/MinIO healthy | Imagens server/web/worker recompiladas; dependências locais                                                             |
| Dependency audit   | PASS: nenhuma vulnerabilidade conhecida              | `work/admin-v1-audit.log`; `pnpm audit --prod`                                                                          |
| Git diff           | PASS                                                 | `git diff --check`                                                                                                      |

Os warnings estáticos foram registrados; PASS não significa zero warnings. As integrações usam o banco local separado `admin_v1_test` e Redis DB 12; os testes unitários usam Redis DB 15. Os fixtures do browser são criados e removidos na stack Docker local. Os limites reais de autenticação permaneceram ativos; as execuções aguardaram a expiração natural da janela.

## Seed de desenvolvimento

Arquivo: `packages/api/src/scripts/dev-seed.ts`.

Fornecer no processo `NODE_ENV=development`, `DATABASE_URL` local, `DEV_SEED_PASSWORD` com pelo menos 16 caracteres e as variáveis runtime necessárias para DB/auth/cache. Executar:

```sh
pnpm exec tsx packages/api/src/scripts/dev-seed.ts
```

Contas: `super_admin`, `platform_admin`, `engineering`, `security`, `support`, `readonly`, `user-a` e `user-b`, todas no domínio `admin-v1.local.test`. Usuários privilegiados devem cadastrar MFA em `/app/security` antes de entrar no Admin. O script não imprime senha, seed TOTP, cookies ou tokens. `NODE_ENV=production` sempre causa HARD FAIL antes de qualquer acesso ao banco.

## Bugs reais corrigidos

- Tipos Vite indisponíveis no programa TypeScript consumidor do contrato público; packages sem tsconfig herdavam o contexto raiz incorreto.
- O alias SSR de build continuava retornando valores vazios no runtime de produção; agora encaminha consultas autenticadas à API, somente com o cookie necessário.
- Cursor de workspace passava Date incompatível para o parâmetro SQL; agora usa timestamp ISO explícito. Booleanos legados nulos não apareciam nos filtros active/MFA=false; normalização SQL corrigida.
- Guards genéricos permitiam ou bloqueavam módulos incorretamente; endpoints, navegação e busca agora usam permissões específicas.
- Inputs de paginação/data e erros de mutações precisavam de validação/códigos controlados; limites e rejeições estão cobertos.
- Runner unitário ignorava porta Redis configurada e harness de integração podia continuar sem adquirir o lock; ambos corrigidos. Integrações executam serialmente e o teste de memória tem GC explícito, preservando seu limite original.

Nenhum trabalho da Fase 4 foi iniciado. O relatório contém somente evidência de validação local; não declara deploy externo.
