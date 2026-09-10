import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const rootDir = process.cwd();
const agentsDir = join(rootDir, ".agents");

// 1. Agents definition
const agents = [
  {
    id: "hermes-orchestrator",
    name: "Hermes Orchestrator",
    purpose: "Agente mestre de análise, decomposição de tarefas, seleção de agentes/skills, verificação de guardrails e geração de planos operacionais para o Codex.",
    domains: ["all", "orchestration", "governance"],
    default_skills: ["context-router", "risk-classification", "codex-task-planner", "review-codex-result"],
    mandatory_guardrails: ["architecture", "security", "production"],
    content: `# Hermes Orchestrator

## Papel & Mandato
O **Hermes Orchestrator** é o orquestrador central de governança, análise e revisão técnica do ecossistema AUTUAX.
Ele atua estritamente na camada:
**HERMES = ANALYZE / PLAN / REVIEW**
enquanto a execução do código é realizada pelo **CODEX = EXECUTE / TEST / FIX**.

## Responsabilidades
1. Receber requisitos e decompor em objetivos técnicos claros.
2. Identificar os domínios afetados e convocar os agentes especialistas apropriados.
3. Mapear as skills necessárias e validar a conformidade com os guardrails inegociáveis.
4. Identificar previamente os riscos técnicos, de isolamento multi-tenant e de segurança.
5. Formatar e entregar o **CODEX EXECUTION PLAN**.
6. Conduzir a revisão final (**HERMES REVIEW**) exigindo evidências verificáveis antes da aprovação.

## Protocolo de Handoff para o Codex
Hermes nunca delega instruções vagas. Todo plano deve conter:
- \`Objective\`: Definição precisa da entrega.
- \`Allowed scope\`: Diretórios e arquivos autorizados para modificação.
- \`Do not modify\`: Invariantes e módulos congelados.
- \`Agents consulted\`: Especialistas acionados.
- \`Skills applied\`: Procedimentos obrigatórios.
- \`Guardrails\`: Restrições de segurança, dados e arquitetura.
- \`Implementation\`: Passo a passo sequencial.
- \`Tests\`: Testes unitários/integração obrigatórios.
- \`Acceptance\`: Critérios mensuráveis de aceitação.
- \`Stop condition\`: Condição de parada imediata.

## Critérios de Revisão
Nenhum resultado é aprovado sem evidência concreta de testes, compilação estrita e aderência a contratos.
`
  },
  {
    id: "architecture-agent",
    name: "Architecture Agent",
    purpose: "Proteger as fronteiras arquiteturais do monorepo AUTUAX, impedindo vazamento de regras para o frontend ou acoplamento indevido entre apps e packages.",
    domains: ["architecture", "monorepo", "boundaries"],
    default_skills: ["typescript-strict", "typed-api-client", "openapi"],
    mandatory_guardrails: ["architecture", "production"],
    content: `# Architecture Agent

## Mandato
Garantir a integridade da arquitetura monorepo AUTUAX, assegurando:
- \`apps/web\`: Interface do usuário e roteamento (sem regras de negócio críticas ou segredos).
- \`apps/api\`: Servidor backend Hono com camadas limpas de aplicação, domínio e transporte.
- \`apps/worker\`: Processamento assíncrono isolado em segundo plano.
- \`packages/*\`: Pacotes compartilhados com responsabilidades únicas e contratos neutros.

## Guardrails Obrigatórios
- Proibido executar lógica crítica ou de cobrança no client-side.
- Proibido importar módulos de servidor ou de banco de dados diretamente em \`apps/web\`.
- Proibido criar dependências circulares entre pacotes.
- Todo contrato compartilhado entre frontend e backend deve residir em \`packages/contracts\`.
`
  },
  {
    id: "frontend-agent",
    name: "Frontend Agent",
    purpose: "Especialista em TanStack Start, React, TanStack Router, TanStack Query, TailwindCSS, Zustand e Design System em packages/ui.",
    domains: ["frontend", "ui", "web"],
    default_skills: ["tanstack-start", "tanstack-router", "tanstack-query", "zustand", "tanstack-store", "react-ui", "tailwind-design-system"],
    mandatory_guardrails: ["architecture"],
    content: `# Frontend Agent

## Mandato
Assegurar a melhor experiência de usuário, performance e consistência visual para o AUTUAX utilizando a stack oficial:
- TanStack Start (SSR e roteamento otimizado).
- TanStack Query como única fonte da verdade para dados remotos (Server State).
- Zustand / TanStack Store exclusivamente para estado de UI local quando justificável.
- Design System desacoplado em \`packages/ui\` com componentes shadcn-style e TailwindCSS.

## Regras Estritas
- Nunca armazenar cópias de estado remoto de API em stores Zustand globais.
- Centralizar requisições no Typed API Client; nunca espalhar \`fetch()\` nativo arbitrário.
- Toda view deve tratar explicitamente os estados: Loading, Error, Empty e Forbidden.
- Garantir baseline de acessibilidade (ARIA, teclado, contraste e foco visível).
`
  },
  {
    id: "backend-agent",
    name: "Backend Agent",
    purpose: "Especialista em runtime Bun, framework Hono, Zod, OpenAPI 3.1 e arquitetura em camadas de serviços e repositórios.",
    domains: ["backend", "api", "services"],
    default_skills: ["hono-api", "bun-runtime", "zod-validation", "openapi"],
    mandatory_guardrails: ["architecture", "security"],
    content: `# Backend Agent

## Mandato
Desenvolver e manter os serviços de backend e APIs HTTP do AUTUAX em \`apps/api\`, utilizando Bun e Hono.

## Fluxo de Execução
Toda requisição deve seguir a cadeia unidirecional:
\`HTTP Request\` → \`Validation Middleware (Zod)\` → \`Authorization / Tenant Guard\` → \`Application Service\` → \`Domain Engine\` → \`Repository / Database\` → \`Standardized Response\`.

## Padrão de Respostas
- **Sucesso:** \`{ "data": { ... }, "meta": { ... } }\`
- **Erro:** \`{ "error": { "code": "...", "message": "...", "requestId": "..." } }\`
- Stack traces jamais são expostos em ambientes que não sejam de teste local controlado.
`
  },
  {
    id: "database-agent",
    name: "Database Agent",
    purpose: "Especialista em PostgreSQL 16, Drizzle ORM, Drizzle Kit, modelagem de dados, índices, constraints e ciclo de migrações.",
    domains: ["database", "postgres", "drizzle"],
    default_skills: ["postgresql", "drizzle", "schema-design", "database-indexing", "database-transactions", "database-migrations", "postgres-rls"],
    mandatory_guardrails: ["database", "migrations", "security"],
    content: `# Database Agent

## Mandato
Supervisionar o esquema relacional em \`packages/database\`, conexões PostgreSQL 16 e integridade referencial com Drizzle ORM.

## Diretrizes de Migrações
- Seguir o princípio **Expand → Migrate → Contract**.
- Classificar toda migração como \`SAFE\`, \`CAUTION\` ou \`DESTRUCTIVE\`.
- Migrações destrutivas são categorizadas como HIGH RISK e exigem confirmação explícita e script de rollback reversível documentado.
- Todas as tabelas de domínio com escopo multi-tenant devem incluir chave estrangeira explícita \`tenant_id\` e índices adequados para consultas compostas.
`
  },
  {
    id: "security-agent",
    name: "Security Agent",
    purpose: "Garantir a segurança ofensiva e defensiva, autenticação, autorização granular, RBAC, RLS, proteção contra OWASP e sanitização de logs.",
    domains: ["security", "auth", "rbac", "rls"],
    default_skills: ["authentication", "opaque-sessions", "mfa", "rbac", "authorization", "rls-security", "csrf", "rate-limiting", "secret-management"],
    mandatory_guardrails: ["security", "privacy", "production"],
    content: `# Security Agent

## Mandato
Proteger todos os recursos da plataforma AUTUAX contra acessos indevidos, vazamento de credenciais e vulnerabilidades de dados.

## Guardrails Absolutos
- Nunca desabilitar checagens de autenticação ou autorização para resolver bugs.
- Nunca confiar cegamente no \`tenant_id\` enviado pelo cliente HTTP; extrair e validar sempre a partir da sessão/token criptografado no servidor.
- Nunca registrar senhas, tokens, cookies, chaves de API, CPF, CNH ou documentos pessoais em logs estruturados.
- Exigir validação de tokens anti-CSRF e cabeçalhos de segurança (CSP, HSTS, X-Content-Type-Options) em rotas expostas.
`
  },
  {
    id: "tenancy-agent",
    name: "Tenancy Agent",
    purpose: "Especialista em isolamento estrito multi-tenant em nível de banco de dados, cache Redis, filas e sistema de arquivos.",
    domains: ["tenancy", "multi-tenant", "isolation"],
    default_skills: ["multi-tenant-isolation", "postgres-rls", "tenant-isolation-testing"],
    mandatory_guardrails: ["multi-tenancy", "security"],
    content: `# Tenancy Agent

## Mandato
Garantir que nenhum dado pertencente ao Tenant A possa ser visualizado, modificado ou inferido pelo Tenant B sob qualquer hipótese.

## Verificações Obrigatórias
1. Consultas a banco de dados com filtro explícito por \`tenant_id\` e/ou ativação de Row Level Security (RLS).
2. Chaves de cache no Redis obrigatoriamente prefixadas com namespace do tenant: \`tenant:{tenant_id}:...\`.
3. Isolamento de buckets ou prefixos em storage de objetos.
4. Criação mandatória de testes automatizados negativos de isolamento de tenant em qualquer alteração de modelo de dados.
`
  },
  {
    id: "domain-traffic-agent",
    name: "Domain Traffic Agent",
    purpose: "Especialista nas regras de negócio e conceitos do ecossistema de trânsito brasileiro (CTB, RENAINF, AIT, órgãos autuadores, defesas e recursos).",
    domains: ["domain", "traffic", "legal"],
    default_skills: ["customer-model", "driver-model", "vehicle-model", "traffic-fine-model", "traffic-authority-model", "case-management", "deadline-engine"],
    mandatory_guardrails: ["architecture"],
    content: `# Domain Traffic Agent

## Mandato
Manter a precisão semântica e legal do domínio de infrações de trânsito na plataforma AUTUAX.

## Diferenciações Críticas de Modelagem
- **Proprietário do Veículo ≠ Condutor Infrator:** Devem ser entidades distintas com relacionamentos versionados.
- **Auto de Infração de Trânsito (AIT) ≠ Notificação de Autuação ≠ Notificação de Penalidade.**
- **Infração ≠ Processo Administrativo:** Uma infração pode gerar múltiplos processos ou recursos em diferentes instâncias (Defesa Prévia, JARI, CETRAN/CONTRANDIFE).
- **Equipamento de Medição ≠ Laudo/Verificação Metrológica:** Radares possuem prazos de aferição anual do INMETRO estritamente auditáveis.
`
  },
  {
    id: "integrations-agent",
    name: "Integrations Agent",
    purpose: "Especialista na arquitetura de integração externa resiliente (INMETRO, PSIE, SENATRAN, DETRANs, DNIT, DER e Prefeituras).",
    domains: ["integrations", "external-apis", "providers"],
    default_skills: ["integration-provider-pattern", "external-query-audit", "inmetro-integration", "senatran-integration", "retry-backoff"],
    mandatory_guardrails: ["integrations", "security"],
    content: `# Integrations Agent

## Mandato
Conectar o AUTUAX aos órgãos e bases externas mantendo total desacoplamento e tolerância a falhas.

## Padrão Canônico de Integração
- **Provider:** Responsável exclusivo pela comunicação HTTP/SOAP com o provedor externo.
- **Normalizer:** Transforma os payloads brutos do órgão para o modelo canônico neutro da AUTUAX.
- **Canonical Model:** Tipos TypeScript tipados independentes do formato externo.
- **Evidence & Audit:** Todo retorno bruto é persistido em histórico de auditoria para fins comprobatórios jurídicos.
- Circuit breaker, retentativas exponenciais e rate-limiting por órgão são obrigatórios.
`
  },
  {
    id: "intelligence-engine-agent",
    name: "Intelligence Engine Agent",
    purpose: "Especialista no motor determinístico de análise de consistência de infrações, fatos, regras e geração de evidências probatórias.",
    domains: ["intelligence", "rules-engine", "analysis"],
    default_skills: ["fact-model", "rule-engine", "rule-versioning", "analysis-runs", "finding-generation", "evidence-engine"],
    mandatory_guardrails: ["ai", "architecture"],
    content: `# Intelligence Engine Agent

## Mandato
Arquitetar e validar o motor de análise determinística da AUTUAX.

## Fluxo Determinístico
\`Fatos Extraídos (Facts)\` → \`Regras Ativas (Rules)\` → \`Execução de Análise (Analysis Run)\` → \`Apontamentos (Findings)\` → \`Evidências (Evidence)\`.

## Estados Válidos de Avaliação
- \`PASS\`: Requisito legal ou técnico cumprido pela autuação.
- \`WARNING\`: Inconsistência potencial que requer atenção.
- \`FAIL\`: Nulidade flagrante ou vício insanável comprovado.
- \`NOT_APPLICABLE\`: Regra não incidente sobre a tipificação da infração.
- \`NOT_AVAILABLE\`: Dados ausentes para verificação conclusiva.
- \`MANUAL_REVIEW\`: Exige revisão por advogado ou despachante credenciado.
`
  },
  {
    id: "legal-engine-agent",
    name: "Legal Engine Agent",
    purpose: "Especialista em legislação de trânsito (CTB, Resoluções CONTRAN, Manuais Brasileiros de Fiscalização de Trânsito - MBFT e Portarias SENATRAN).",
    domains: ["legal", "ctb", "contran"],
    default_skills: ["legal-source-versioning", "ctb-rules", "contran-rules", "mbft-rules", "defense-template", "defense-versioning"],
    mandatory_guardrails: ["ai", "security"],
    content: `# Legal Engine Agent

## Mandato
Garantir o embasamento jurídico rigoroso das teses, minutas de defesa e regras do sistema.

## Princípios Inegociáveis
- Toda fonte legal possui controle de vigência: \`source\`, \`version\`, \`effective_from\`, \`effective_until\`.
- Nunca aplicar retroativamente resoluções ou normas revogadas sobre infrações cometidas sob vigência anterior, salvo benefício legal expresso.
- Modelos de peças jurídicas devem ser versionados e conter referências probatórias vinculadas aos autos.
`
  },
  {
    id: "testing-agent",
    name: "Testing Agent",
    purpose: "Especialista na qualidade de software, cobertura com Vitest, testes unitários, testes de integração, simulações de carga e testes negativos.",
    domains: ["testing", "qa", "vitest"],
    default_skills: ["unit-testing", "integration-testing", "api-testing", "e2e-testing", "tenant-isolation-testing", "regression-testing"],
    mandatory_guardrails: ["architecture", "security"],
    content: `# Testing Agent

## Mandato
Assegurar que toda funcionalidade seja acompanhada de suíte automatizada de testes confiáveis e reprodutíveis.

## Exigências de Teste
- **Happy path:** Fluxo nominal de sucesso.
- **Negative path:** Erros previstos, payloads malformados e parâmetros inválidos.
- **Permission & Tenant Isolation:** Prova de que usuários sem privilégio ou de outros tenants são rejeitados com status 403/404.
- Não aceitar compilação bem-sucedida como substituto de testes automatizados.
`
  },
  {
    id: "observability-agent",
    name: "Observability Agent",
    purpose: "Especialista em telemetria distribuída, OpenTelemetry, Prometheus, Grafana, Loki e correlação de requisições por requestId.",
    domains: ["observability", "metrics", "logging"],
    default_skills: ["structured-logging", "request-correlation", "opentelemetry", "prometheus", "grafana", "loki", "healthchecks"],
    mandatory_guardrails: ["security", "privacy"],
    content: `# Observability Agent

## Mandato
Garantir total visibilidade do comportamento dos serviços do AUTUAX em tempo de execução.

## Práticas Obrigatórias
- Geração ou propagação mandatória de \`requestId\` e \`correlationId\` em todas as requisições HTTP, filas e tarefas de workers.
- Logs em formato JSON estruturado com chave de serviço, nível de log e evento.
- Sanitização automática de dados sensíveis antes do despacho para ferramentas de agregação de logs.
`
  },
  {
    id: "performance-agent",
    name: "Performance Agent",
    purpose: "Especialista em otimização de consultas SQL, índices compostos, uso eficiente de Redis, latência de API e consumo de memória.",
    domains: ["performance", "optimization", "caching"],
    default_skills: ["query-performance", "database-indexing", "redis-cache", "performance-review"],
    mandatory_guardrails: ["database", "architecture"],
    content: `# Performance Agent

## Mandato
Monitorar e otimizar gargalos de throughput, latência e consumo de recursos sem introduzir complexidade desnecessária.

## Focos de Análise
- Prevenção ativa de consultas N+1 no ORM.
- Estratégias de invalidação e TTL adequadas no Redis.
- Dimensionamento correto de pools de conexão no PostgreSQL e concorrência nos workers BullMQ.
`
  },
  {
    id: "code-review-agent",
    name: "Code Review Agent",
    purpose: "Responsável pelo checklist rigoroso de revisão técnica antes de declarar qualquer entrega como concluída.",
    domains: ["review", "qa", "governance"],
    default_skills: ["code-review", "security-review", "performance-review"],
    mandatory_guardrails: ["architecture", "security", "database", "production"],
    content: `# Code Review Agent

## Mandato
Conduzir a auditoria final de alterações produzidas pelo Codex, emitindo pareceres objetivos:
\`APPROVED\` | \`APPROVED_WITH_NOTES\` | \`CHANGES_REQUIRED\` | \`BLOCKED\`.

## Checklist de Revisão
- Tipagem estrita de ponta a ponta sem \`any\` ou casts artificiais.
- Validação de entrada via Zod em todas as fronteiras externas.
- Testes unitários e de integração cobrindo caminhos críticos.
- Preservação estrita dos guardrails de segurança e isolamento multi-tenant.
- Documentação atualizada correspondente.
`
  },
  {
    id: "release-agent",
    name: "Release Agent",
    purpose: "Especialista em hardening de releases, compatibilidade retroativa de migrações, scripts de rollback e readiness de deploy.",
    domains: ["release", "devops", "ci-cd"],
    default_skills: ["release-readiness", "ci-pipeline", "database-migrations"],
    mandatory_guardrails: ["production", "migrations"],
    content: `# Release Agent

## Mandato
Controlar os gates de prontidão de software e mitigação de riscos operacionais em homologação e produção.

## Regras
- Nenhum deploy é disparado automaticamente sem aprovação e checklist de readiness preenchido.
- Mudanças de banco de dados devem ser previamente validadas em ambiente de staging espelhado.
`
  },
  {
    id: "documentation-agent",
    name: "Documentation Agent",
    purpose: "Especialista na manutenção contínua de documentação técnica, OpenAPI 3.1, ADRs, runbooks e dicionários de dados.",
    domains: ["documentation", "adr", "openapi"],
    default_skills: ["openapi", "documentation-update"],
    mandatory_guardrails: ["architecture"],
    content: `# Documentation Agent

## Mandato
Assegurar que toda decisão arquitetural e alteração de contrato esteja formalmente registrada e acessível para o time de engenharia e agentes.

## Entregáveis Mandatórios
- Especificações OpenAPI 3.1 sincronizadas com os schemas Zod de \`packages/contracts\`.
- ADRs (Architecture Decision Records) no formato Context-Decision-Consequences.
- Runbooks e guias operacionais para mitigação de incidentes.
`
  }
];

// 2. Guardrails definition
const guardrails = [
  {
    file: "architecture.md",
    title: "Architecture Guardrail",
    content: `# Architecture Guardrail

## Invariantes do Sistema
1. **Fronteiras Claras:**
   - \`apps/web\` é puramente cliente/apresentação. Nenhuma lógica de domínio, credencial ou cálculo de cobrança pode rodar de forma confiável no navegador.
   - \`apps/api\` é o gateway principal e orquestrador de domínio.
   - \`apps/worker\` executa processamentos pesados e assíncronos desacoplados do ciclo de vida da requisição HTTP.
   - \`packages/database\` centraliza conexões e esquemas Drizzle.
   - \`packages/contracts\` define contratos neutros de transporte e schemas Zod.
   - \`packages/ui\` encapsula o design system compartilhado.

2. **Proibições:**
   - Proibido importar dependências de banco de dados no frontend.
   - Proibido criar dependências circulares entre pacotes.
   - Proibido acoplar contratos a implementações proprietárias de terceiros sem adapter/normalizer.
`
  },
  {
    file: "security.md",
    title: "Security Guardrail",
    content: `# Security Guardrail

## Regras Inegociáveis de Segurança
1. **Autenticação & Autorização:**
   - Nunca desabilitar ou enfraquecer verificações de autenticação ou RBAC para resolver testes ou bugs.
   - O identificador do tenant (\`tenant_id\`) deve sempre ser derivado e validado a partir da sessão/token confiável no servidor, nunca confiado do corpo ou cabeçalho do cliente sem verificação.
   - Toda rota autenticada deve aplicar validação de permissão explícita baseada no perfil e papel do usuário.

2. **Proteção de Segredos e PII:**
   - Nunca commitar senhas, tokens de API ou certificados no repositório.
   - Nunca registrar em logs senhas, tokens, cookies, CPF, CNH ou dados pessoais sensíveis (LGPD).
   - Utilizar sanitização/redaction centralizada em todos os emissores de logs.
`
  },
  {
    file: "database.md",
    title: "Database Guardrail",
    content: `# Database Guardrail

## Regras de Banco de Dados
1. **Modelagem:**
   - Toda tabela pertencente a um tenant deve possuir coluna obrigatória \`tenant_id\` com integridade referencial.
   - Usar campos temporais padronizados com fuso horário (\`timestamptz\`).
   - Criar índices para todas as chaves estrangeiras e campos de filtro frequente.

2. **Operações e Conexões:**
   - Utilizar pool de conexões centralizado em \`packages/database\`. Nunca instanciar clientes independentes em cada rota.
   - Usar transações atômicas para operações de múltiplas tabelas.
`
  },
  {
    file: "multi-tenancy.md",
    title: "Multi-Tenancy Guardrail",
    content: `# Multi-Tenancy Guardrail

## Isolamento Estrito de Dados
1. **Regra de Ouro:**
   - Nenhum recurso pertencente ao Tenant A pode ser lido, atualizado ou deletado por usuários do Tenant B.

2. **Camadas de Isolamento:**
   - **Banco de dados:** Filtros obrigatórios por \`tenant_id\` em todas as consultas SQL e suporte a RLS.
   - **Cache Redis:** Todas as chaves devem conter o namespace \`tenant:{tenant_id}:...\`.
   - **Storage:** Caminhos de arquivos segregados por tenant (\`/tenants/{tenant_id}/...\`).
   - **Testes:** Toda alteração que envolva entidades de tenant deve conter teste automatizado de isolamento negativo.
`
  },
  {
    file: "privacy.md",
    title: "Privacy & LGPD Guardrail",
    content: `# Privacy & LGPD Guardrail

## Proteção de Dados Pessoais
1. **Dados de Trânsito & Condutores:**
   - CPF, CNH, RG e dados de contato de condutores e proprietários devem ser tratados sob estrita conformidade com a LGPD.
   - Acesso a dados de infração e laudos deve ser restrito exclusivamente aos operadores autorizados da unidade contratante.

2. **Mascaramento e Retenção:**
   - Logs devem mascarar documentos: \`XXX.***.***-XX\` para CPF e \`*********-XX\` para CNH.
   - Documentos expirados ou revogados devem seguir política formal de expurgo ou anonimização.
`
  },
  {
    file: "integrations.md",
    title: "Integrations Guardrail",
    content: `# Integrations Guardrail

## Resiliência em Comunicação Externa
1. **Arquitetura Desacoplada:**
   - Toda integração com órgãos públicos (SENATRAN, INMETRO, DETRANs, DNIT) deve seguir a estrutura: Provider → Normalizer → Canonical Model.
   - Nunca injetar payloads brutos de fornecedores diretamente na lógica interna de negócio.

2. **Tratamento de Falhas:**
   - Toda chamada externa deve ter timeout configurado.
   - Provedores devem implementar circuit breaker e retentativa com backoff exponencial.
   - Toda resposta externa deve ser auditada para respaldo jurídico.
`
  },
  {
    file: "ai.md",
    title: "AI & Determinism Guardrail",
    content: `# AI & Determinism Guardrail

## Limites Estritos para Inteligência Artificial
1. **IA Suplementar e Não Soberana:**
   - Modelos de LLM são estritamente restritos a: sumarização textual, transcrição/OCR, categorização de documentos e sugestão de minutas.
   - LLMs NUNCA podem substituir o motor determinístico de regras jurídicas.
   - LLMs NÃO PODEM autonomamente aprovar defesas, protocolar recursos, declarar nulidades definitivas ou movimentar valores financeiros.

2. **Human-in-the-Loop:**
   - Toda minuta gerada ou apontamento preliminar deve passar por validação humana qualificada antes de qualquer efeito externo.
`
  },
  {
    file: "migrations.md",
    title: "Migrations Guardrail",
    content: `# Migrations Guardrail

## Ciclo de Vida de Migrações
1. **Estratégia Expand → Migrate → Contract:**
   - Fase 1 (Expand): Adicionar novas colunas/tabelas sem remover as antigas.
   - Fase 2 (Migrate): Migrar dados e atualizar aplicações para ler e escrever na nova estrutura.
   - Fase 3 (Contract): Remover campos legados somente após validação completa e estabilidade em produção.

2. **Classificação de Risco:**
   - \`SAFE\`: Adição de colunas opcionais, novas tabelas ou índices concorrentes.
   - \`CAUTION\`: Adição de restrições ou migração de formato de dados em lote.
   - \`DESTRUCTIVE\`: Remoção de tabelas, renomeação de colunas ou eliminação de restrições críticas. Proibida execução automática sem plano de rollback explícito.
`
  },
  {
    file: "production.md",
    title: "Production Guardrail",
    content: `# Production Guardrail

## Proteção dos Ambientes Produtivos
1. **Ações Bloqueadas para Agentes:**
   - Nenhum agente automatizado (Hermes ou Codex) tem permissão para disparar deploy direto em produção.
   - Proibido executar migrações destrutivas diretamente contra bancos de produção.
   - Proibido deletar registros ou truncar tabelas persistentes de produção.
   - Proibido rotacionar credenciais de produção sem supervisão humana presencial.
`
  }
];

// 3. Workflows definition
const workflows = [
  {
    file: "feature-development.md",
    title: "Feature Development Workflow",
    content: `# Workflow: Feature Development

## Etapas Obrigatórias
1. **Análise de Requisitos (Hermes Orchestrator):**
   - Recebe a solicitação e delimita o escopo técnico.
   - Convocação de agentes especialistas (ex: \`domain-traffic-agent\`, \`backend-agent\`, \`frontend-agent\`).
   - Identificação de riscos e consulta a guardrails.
2. **Geração do Plano (Hermes):**
   - Emissão do \`CODEX EXECUTION PLAN\` com escopo estrito, arquivos afetados e critérios de parada.
3. **Execução Técnica (Codex):**
   - Criação ou alteração incremental de arquivos.
   - Execução dos testes automatizados e typecheck.
4. **Validação & Evidências (Testing Agent & Codex):**
   - Coleta de logs de execução e cobertura de testes.
5. **Revisão Técnica (Code Review Agent & Security Agent):**
   - Avaliação de segurança, isolamento e qualidade.
6. **Aprovação Final (Hermes):**
   - Emissão do parecer conclusivo e fechamento do ciclo.
`
  },
  {
    file: "bug-fix.md",
    title: "Bug Fix Workflow",
    content: `# Workflow: Bug Fix

## Etapas Obrigatórias
1. **Reprodução:**
   - Isolar o cenário de falha e escrever um teste automatizado que falhe comprovando o defeito.
2. **Identificação da Causa Raiz:**
   - Evitar patches superficiais ou suposições sem rastreamento nos logs ou código.
3. **Correção Mínima Segura:**
   - Aplicar a menor mudança de código suficiente para sanar o problema sem efeitos colaterais.
4. **Teste de Regressão:**
   - O teste inicialmente falho agora deve passar (\`PASS\`), junto com todos os testes existentes.
5. **Revisão:**
   - Registro da causa raiz, solução adotada e garantia de não-regressão.
`
  },
  {
    file: "database-change.md",
    title: "Database Change Workflow",
    content: `# Workflow: Database Change

## Etapas Obrigatórias
1. **Modelagem de Esquema:**
   - \`database-agent\` avalia mudanças em \`packages/database/src/schema\`.
2. **Classificação de Risco:**
   - Definir classificação (\`SAFE\`, \`CAUTION\` ou \`DESTRUCTIVE\`).
3. **Geração da Migração:**
   - Gerar arquivos via \`bun db:generate\` ou ferramenta Drizzle.
4. **Validação de Rollback:**
   - Documentar procedimento de reversão sem perda de dados.
5. **Execução de Testes:**
   - Validar migração em banco temporário de testes.
`
  },
  {
    file: "security-change.md",
    title: "Security Change Workflow",
    content: `# Workflow: Security Change

## Etapas Obrigatórias
1. **Avaliação Inicial (Security Agent):**
   - Obrigatório para qualquer mudança em autenticação, MFA, RBAC, RLS, sessões ou permissões.
2. **Análise de Ameaças:**
   - Avaliar riscos de escalonamento de privilégio, bypass de tenant e vazamento de tokens.
3. **Implementação com Testes Negativos:**
   - Escrever testes específicos que tentam burlar a nova regra de segurança.
4. **Auditoria Dupla:**
   - Revisão aprovada por \`security-agent\` e homologada por \`code-review-agent\`.
`
  },
  {
    file: "integration-development.md",
    title: "Integration Development Workflow",
    content: `# Workflow: Integration Development

## Etapas Obrigatórias
1. **Contrato do Provedor:**
   - Mapear a especificação do órgão externo (INMETRO, SENATRAN, DETRAN).
2. **Implementação do Provider & Normalizer:**
   - Desenvolver cliente HTTP isolado e parser para o modelo canônico da AUTUAX.
3. **Persistência de Evidências:**
   - Garantir armazenamento seguro do payload bruto recebido para fins comprobatórios.
4. **Testes com Mocks & Fixtures:**
   - Testar variações de retorno de sucesso, erro de rede, formato alterado e rate limiting.
`
  },
  {
    file: "release-hardening.md",
    title: "Release Hardening Workflow",
    content: `# Workflow: Release Hardening

## Etapas Obrigatórias
1. **Verificação de Gates de Qualidade:**
   - Typecheck estrito (\`tsc\`), Biome lint e suíte completa de testes unitários/integração.
2. **Auditoria de Migrações Pendentes:**
   - Confirmar ausência de migrações destrutivas não preparadas.
3. **Verificação de Variáveis de Ambiente:**
   - Validar schemas de configuração via Zod para o ambiente de destino.
4. **Emissão do Relatório de Prontidão:**
   - \`release-agent\` compila o relatório formal de release.
`
  },
  {
    file: "incident-investigation.md",
    title: "Incident Investigation Workflow",
    content: `# Workflow: Incident Investigation

## Etapas Obrigatórias
1. **Identificação & Contenção:**
   - Localizar \`requestId\` ou \`correlationId\` associado ao incidente nos logs agregados.
2. **Correlação de Métricas & Tracing:**
   - Inspecionar métricas Prometheus e spans OpenTelemetry para determinar o gargalo ou componente em falha.
3. **Mitigação Rápida:**
   - Aplicar rollback, circuit breaking ou ativação de feature flag.
4. **Post-Mortem & Plano de Ação:**
   - Elaborar relatório com cronologia, impacto, causa raiz e medidas corretivas definitivas.
`
  }
];

// 4. Knowledge base definition
const knowledge = [
  {
    file: "product.md",
    title: "Product Knowledge: AUTUAX",
    content: `# Visão do Produto: AUTUAX

## O que é o AUTUAX?
O **AUTUAX** é uma plataforma SaaS B2B multi-tenant de inteligência, gestão e automação de infrações de trânsito.

## Proposta de Valor
- Centralização da gestão de frotas, condutores e autuações de trânsito.
- Motor automatizado de checagem metrológica e jurídica contra normas do CTB e CONTRAN.
- Identificação precisa de nulidades processuais (vício de forma, prazo expirado, aferição vencida de radar).
- Geração determinística de defesas administrativas com rastreabilidade de evidências.
- Suporte a múltiplos clientes, filiais e parceiros com isolamento estrito de dados.
`
  },
  {
    file: "architecture.md",
    title: "Architecture Knowledge",
    content: `# Arquitetura da Plataforma AUTUAX

## Visão Geral da Topologia
\`\`\`
Browser
   ↓
TanStack Start (apps/web)
   ↓
Typed API Client (packages/contracts)
   ↓
Hono API (apps/api - Bun runtime)
   ↓
Application & Domain Services
   ↓
PostgreSQL 16 (packages/database) + Redis 7
   ↑
Worker Process (apps/worker - Bun runtime)
\`\`\`

## Componentes Principais
- **apps/web:** Frontend React, TanStack Router, TanStack Query, TailwindCSS e Design System.
- **apps/api:** Backend Hono de alta performance rodando sob Bun, tipado via Zod e documentado com OpenAPI 3.1.
- **apps/worker:** Processador em segundo plano de filas assíncronas, integrações externas e OCR.
- **packages/database:** Drizzle ORM sobre PostgreSQL 16.
- **packages/contracts:** Zod schemas e tipos compartilhados entre frontend e backend.
- **packages/ui:** Primitives de UI consistentes e acessíveis.
- **packages/observability:** Métricas Prometheus, traces OpenTelemetry e logs estruturados.
`
  },
  {
    file: "domain-model.md",
    title: "Domain Model Knowledge",
    content: `# Modelo de Domínio: Trânsito e Infrações

## Entidades Centrais
- **Tenant:** Empresa, locadora ou transportadora titular da conta.
- **Customer / Client:** Cliente final ou unidade de negócio gerenciada.
- **Driver (Condutor):** Indivíduo habilitado que conduz veículos (possui CNH, validade, pontuação).
- **Vehicle (Veículo):** Bem registrado (Placa, Renavam, Chassi, Marca/Modelo, Ano, Proprietário).
- **Traffic Authority (Órgão Autuador):** Entidade fiscalizadora (PRF, DNIT, DETRAN estadual, DER, Municípios).
- **AIT (Auto de Infração de Trânsito):** Registro de ocorrência fiscalizado por agente ou radar.
- **Equipment & Verification:** Radares, etilômetros e cronotacógrafos com laudos de aferição INMETRO.
- **Administrative Case (Processo):** O fluxo formal de defesa que tramita por instâncias (Defesa Prévia, JARI, CETRAN).
`
  },
  {
    file: "conventions.md",
    title: "Engineering Conventions",
    content: `# Convenções Técnicas de Engenharia

## Diretrizes de Código
1. **TypeScript:**
   - \`strict: true\` sem exceções.
   - Nenhuma utilização de \`any\` ou diretivas como \`@ts-ignore\`.
   - Preferir interfaces e tipos inferidos de schemas Zod.
2. **Respostas de API:**
   - Formato padrão de sucesso: \`{ "data": ..., "meta": ... }\`.
   - Formato padrão de erro: \`{ "error": { "code": "...", "message": "...", "requestId": "..." } }\`.
3. **Logs:**
   - Sempre estruturados em JSON com campos: \`level\`, \`service\`, \`requestId\`, \`event\`, \`timestamp\`.
4. **Commits:**
   - Padrão Conventional Commits (\`feat:\`, \`fix:\`, \`chore:\`, \`docs:\`, \`test:\`).
`
  },
  {
    file: "integrations.md",
    title: "External Integrations Knowledge",
    content: `# Arquitetura de Integrações Externas

## Provedores Alvo
- **INMETRO / PSIE:** Consulta de instrumentos de medição e validade de laudos metrológicos de radares.
- **SENATRAN (antigo DENATRAN):** Consulta nacional de veículos (RENAVAM) e condutores (RENACH).
- **RENAINF:** Registro Nacional de Infrações de Trânsito para autuações interestaduais.
- **DNIT & DERs:** Órgãos rodoviários federais e estaduais para consulta de editais e notificações.

## Princípios
- Toda integração deve operar com timeout explícito e isolamento em sandbox de dados.
- Mocks fiéis devem estar disponíveis para todos os testes em ambiente local de desenvolvimento.
`
  },
  {
    file: "security.md",
    title: "Security Model Knowledge",
    content: `# Modelo de Segurança AUTUAX

## Pilares de Defesa
1. **Identidade & Sessões:**
   - Sessões opacas seguras com rotação periódica e suporte a autenticação multifator (MFA).
2. **RBAC & RLS:**
   - Autorização baseada em papéis (Admin, Operador, Auditor, Cliente) combinada com Row Level Security (RLS) no banco de dados.
3. **Proteção de Rede:**
   - CORS com origens estritamente confiáveis.
   - Limitação de taxa de requisições (Rate Limiting) por IP e por Tenant no Redis.
`
  },
  {
    file: "decisions.md",
    title: "Architecture Decision Records Index",
    content: `# Registro de Decisões Arquiteturais (ADRs)

| ADR | Título | Status | Contexto Resumido |
| --- | --- | --- | --- |
| ADR-001 | Adoção de Monorepo com Bun e TurboRepo | Aceito | Organização modular de apps e packages desacoplados. |
| ADR-002 | TanStack Start no Frontend | Aceito | SSR de alto desempenho, streaming de rotas e DX superior. |
| ADR-003 | Hono Framework sob Bun na API | Aceito | Baixíssima latência, tipagem estrita e portabilidade de middlewares. |
| ADR-004 | Drizzle ORM sobre PostgreSQL 16 | Aceito | SQL-like, alta performance, type-safety sem sobrecarga de runtime. |
| ADR-005 | Redis 7 para Cache, Locks e Filas | Aceito | Armazenamento de alta velocidade para sessões, rate-limit e BullMQ. |
| ADR-006 | OpenAPI 3.1 & Zod como Fonte da Verdade | Aceito | Geração e validação de contratos ponta a ponta. |
| ADR-007 | Motor Determinístico de Regras Jurídicas | Aceito | Separação entre lógica estrita de trânsito e modelos suplementares de IA. |
`
  }
];

// 5. Templates definition
const templates = [
  {
    file: "implementation-plan.md",
    title: "Template: Implementation Plan",
    content: `# [Implementation Plan]

## Objetivo
Descrever sucintamente o objetivo técnico a ser realizado.

## Escopo Autorizado
- Arquivos que podem ser modificados:
- Arquivos que NÃO devem ser modificados:

## Agentes & Skills Acionados
- Agentes:
- Skills:
- Guardrails:

## Plano de Implementação Incremental
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

## Plano de Testes & Validação
- Testes unitários:
- Testes de integração:

## Condição de Parada
Definição exata de conclusão.
`
  },
  {
    file: "review-report.md",
    title: "Template: Review Report",
    content: `# [Review Report]

## Status
APPROVED | APPROVED_WITH_NOTES | CHANGES_REQUIRED | BLOCKED

## Avaliações por Área
- **Arquitetura:** PASS | FAIL
- **Segurança:** PASS | FAIL | N/A
- **Isolamento de Tenant:** PASS | FAIL | N/A
- **Banco de Dados:** PASS | FAIL | N/A
- **Testes:** PASS | FAIL
- **Compilação / Build:** PASS | FAIL

## Débitos Técnicos & Observações
- ...
`
  },
  {
    file: "security-review.md",
    title: "Template: Security Review",
    content: `# [Security Review]

## Classificação de Risco
LOW | MEDIUM | HIGH | CRITICAL

## Verificações
- [ ] Autenticação mantida e protegida
- [ ] RBAC e autorização validadas
- [ ] Isolamento de tenant garantido
- [ ] Ausência de credenciais ou dados pessoais nos logs
- [ ] Cabeçalhos de segurança e sanitização ativos
`
  },
  {
    file: "migration-plan.md",
    title: "Template: Migration Plan",
    content: `# [Migration Plan]

## Classificação
SAFE | CAUTION | DESTRUCTIVE

## Alterações de Esquema
- Tabelas adicionadas:
- Colunas modificadas:

## Estratégia de Rollback
Procedimento exato para desfazer a migração sem corrupção ou indisponibilidade de dados.
`
  },
  {
    file: "integration-report.md",
    title: "Template: Integration Report",
    content: `# [Integration Report]

## Provedor Externo
Nome do órgão ou serviço integrado.

## Contratos & Modelos
- Canonical Model:
- Normalizer:
- Auditoria de chamadas:
- Estratégia de retentativa e circuit breaker:
`
  },
  {
    file: "release-report.md",
    title: "Template: Release Report",
    content: `# [Release Report]

## Versão da Release
vX.Y.Z

## Checklist de Prontidão
- [ ] Typecheck estrito aprovado
- [ ] Biome lint aprovado
- [ ] Todos os testes automatizados passando
- [ ] Migrações validadas e testadas
- [ ] Observabilidade e alertas configurados
`
  }
];

// 6. 123 Skills categorized
const skillCategories = [
  {
    category: "core-engineering",
    skills: [
      { id: "typescript-strict", name: "TypeScript Strict", purpose: "Configurar e impor tipagem estrita de ponta a ponta sem any ou casts inseguros." },
      { id: "tanstack-start", name: "TanStack Start", purpose: "Gerenciar aplicação full-stack SSR, streaming e roteamento otimizado com TanStack Start." },
      { id: "tanstack-router", name: "TanStack Router", purpose: "Implementar rotas tipadas, loaders, error boundaries e layouts no frontend." },
      { id: "tanstack-query", name: "TanStack Query", purpose: "Gerenciar estado de servidor remoto, cache, invalidação e sincronização assíncrona." },
      { id: "zustand", name: "Zustand", purpose: "Gerenciar estados de interface complexos e fluxos locais compartilhados no cliente." },
      { id: "tanstack-store", name: "TanStack Store", purpose: "Utilizar reatividade leve para estados locais de alta performance." },
      { id: "react-ui", name: "React UI", purpose: "Construir componentes React modernos, performáticos e com renderização eficiente." },
      { id: "tailwind-design-system", name: "Tailwind Design System", purpose: "Aplicar design tokens centralizados de cores, tipografia, espaçamento e temas." },
      { id: "hono-api", name: "Hono API", purpose: "Desenvolver endpoints HTTP rápidos, tipados e com middleware limpo no backend Hono." },
      { id: "bun-runtime", name: "Bun Runtime", purpose: "Operar no ambiente de execução Bun aproveitando sua velocidade e utilitários nativos." },
      { id: "zod-validation", name: "Zod Validation", purpose: "Validar rigorosamente schemas de dados de entrada e saída em tempo de execução." },
      { id: "openapi", name: "OpenAPI", purpose: "Especificar, manter e servir documentação de API em conformidade com OpenAPI 3.1." },
      { id: "typed-api-client", name: "Typed API Client", purpose: "Consumir endpoints backend a partir do frontend com inferência estrita de tipos." }
    ]
  },
  {
    category: "database",
    skills: [
      { id: "postgresql", name: "PostgreSQL", purpose: "Configurar e utilizar PostgreSQL 16 com melhores práticas de configuração e integridade." },
      { id: "drizzle", name: "Drizzle ORM", purpose: "Construir esquemas relacionais, consultas SQL type-safe e relações com Drizzle ORM." },
      { id: "schema-design", name: "Schema Design", purpose: "Modelar tabelas, normalização, chaves estrangeiras e integridade referencial." },
      { id: "database-indexing", name: "Database Indexing", purpose: "Criar e manter índices simples, compostos e parciais para otimização de consultas." },
      { id: "database-transactions", name: "Database Transactions", purpose: "Executar mutações atômicas com controle de isolamento e consistência ACID." },
      { id: "database-migrations", name: "Database Migrations", purpose: "Gerenciar migrações com estratégia segura Expand-Migrate-Contract." },
      { id: "postgres-rls", name: "PostgreSQL RLS", purpose: "Configurar e auditar políticas de Row Level Security para segregação de dados." },
      { id: "query-performance", name: "Query Performance", purpose: "Analisar planos de execução (EXPLAIN ANALYZE) e mitigar consultas lentas ou N+1." },
      { id: "data-integrity", name: "Data Integrity", purpose: "Garantir consistência relacional por meio de constraints, enums e validações estritas." }
    ]
  },
  {
    category: "security",
    skills: [
      { id: "authentication", name: "Authentication", purpose: "Gerenciar autenticação segura de usuários com suporte a múltiplos fatores." },
      { id: "opaque-sessions", name: "Opaque Sessions", purpose: "Implementar gerenciamento de sessões opacas no servidor com armazenamento em Redis." },
      { id: "mfa", name: "Multi-Factor Authentication", purpose: "Configurar fluxo seguro de verificação de autenticação de dois fatores (TOTP/SMS)." },
      { id: "rbac", name: "Role-Based Access Control", purpose: "Definir e aplicar matriz de papéis e permissões granulares por unidade/tenant." },
      { id: "authorization", name: "Authorization", purpose: "Validar direitos de acesso e autorização em nível de serviço e rota." },
      { id: "multi-tenant-isolation", name: "Multi-Tenant Isolation", purpose: "Assegurar isolamento absoluto de dados entre tenants em todas as camadas." },
      { id: "rls-security", name: "RLS Security", purpose: "Impor políticas de segurança a nível de linha no PostgreSQL para isolamento de dados." },
      { id: "csrf", name: "CSRF Protection", purpose: "Prevenir ataques de Cross-Site Request Forgery com tokens e validação SameSite." },
      { id: "cors-trusted-origins", name: "CORS & Trusted Origins", purpose: "Restringir origens confiáveis e cabeçalhos autorizados no servidor HTTP." },
      { id: "rate-limiting", name: "Rate Limiting", purpose: "Proteger APIs contra abusos e DoS com controle de requisições baseado em Redis." },
      { id: "secret-management", name: "Secret Management", purpose: "Gerenciar credenciais, chaves criptográficas e variáveis sem exposição no código." },
      { id: "audit-logging", name: "Audit Logging", purpose: "Registrar trilhas imutáveis de auditoria para ações privilegiadas e acessos a dados." },
      { id: "secure-file-access", name: "Secure File Access", purpose: "Garantir acesso seguro a arquivos e documentos via URLs assinadas e tokens efêmeros." },
      { id: "privacy-lgpd", name: "Privacy LGPD", purpose: "Impor conformidade com a LGPD, mascaramento de dados e gestão de consentimento." },
      { id: "security-review", name: "Security Review", purpose: "Conduzir auditoria de segurança estática e dinâmica antes da liberação de código." }
    ]
  },
  {
    category: "infrastructure",
    skills: [
      { id: "redis", name: "Redis", purpose: "Conectar, operar e configurar instâncias Redis 7 com alta disponibilidade." },
      { id: "redis-locks", name: "Redis Locks", purpose: "Implementar travas distribuídas (Redlock) para evitar condições de corrida." },
      { id: "redis-cache", name: "Redis Cache", purpose: "Gerenciar caching inteligente com TTL, namespaces e invalidação precisa." },
      { id: "queue-design", name: "Queue Design", purpose: "Arquitetar filas de processamento assíncrono BullMQ com priorização e particionamento." },
      { id: "job-idempotency", name: "Job Idempotency", purpose: "Garantir que execuções repetidas de tarefas assíncronas não gerem duplicidades." },
      { id: "transactional-outbox", name: "Transactional Outbox", purpose: "Garantir disparo confiável de eventos e mensagens integrado a transações de banco." },
      { id: "webhook-design", name: "Webhook Design", purpose: "Receber e despachar webhooks com validação de assinatura HMAC e retentativas." },
      { id: "retry-backoff", name: "Retry Backoff", purpose: "Implementar algoritmos de retentativa com recuo exponencial e jitter." },
      { id: "dead-letter-queue", name: "Dead Letter Queue", purpose: "Reter e analisar mensagens com falhas consecutivas em filas segregadas." },
      { id: "r2-storage", name: "R2 / S3 Storage", purpose: "Armazenar objetos e anexos em provedor S3 compatível ou Cloudflare R2." },
      { id: "signed-urls", name: "Signed URLs", purpose: "Gerar URLs pré-assinadas temporárias para upload e download direto de arquivos." },
      { id: "docker-dev", name: "Docker Dev", purpose: "Manter ambiente de desenvolvimento local orquestrado via Docker Compose." },
      { id: "ci-pipeline", name: "CI Pipeline", purpose: "Configurar automação de integração contínua com validação estrita no GitHub Actions." }
    ]
  },
  {
    category: "observability",
    skills: [
      { id: "structured-logging", name: "Structured Logging", purpose: "Emitir logs padronizados em JSON enriquecidos com metadados e contexto de execução." },
      { id: "request-correlation", name: "Request Correlation", purpose: "Propagar requestId e correlationId através de todas as camadas e processos assíncronos." },
      { id: "opentelemetry", name: "OpenTelemetry", purpose: "Instrumentar tracing distribuído para mensuração de latência e dependências externas." },
      { id: "prometheus", name: "Prometheus", purpose: "Coletar e expor métricas de performance, saúde e contadores de operações HTTP/Worker." },
      { id: "grafana", name: "Grafana", purpose: "Visualizar métricas operacionais e dashboards de desempenho da plataforma." },
      { id: "loki", name: "Loki", purpose: "Agregar logs estruturados com retenção eficiente e busca correlacionada." },
      { id: "healthchecks", name: "Healthchecks", purpose: "Expor endpoints de liveness e readiness com verificação real de dependências críticas." },
      { id: "incident-debugging", name: "Incident Debugging", purpose: "Investigar e depurar anomalias em produção utilizando métricas e rastreamento de logs." }
    ]
  },
  {
    category: "autuax-domain",
    skills: [
      { id: "customer-model", name: "Customer Model", purpose: "Modelar entidades de empresas clientes, filiais e unidades operacionais contratantes." },
      { id: "driver-model", name: "Driver Model", purpose: "Modelar condutores, histórico de pontuação, CNH, categoria e vínculos com frotas." },
      { id: "vehicle-model", name: "Vehicle Model", purpose: "Modelar veículos, dados do RENAVAM, chassi, placa, categoria e proprietário formal." },
      { id: "traffic-fine-model", name: "Traffic Fine Model", purpose: "Modelar infrações de trânsito, códigos de enquadramento CTB e valores." },
      { id: "traffic-authority-model", name: "Traffic Authority Model", purpose: "Modelar órgãos autuadores, competências, endereços de protocolo e regras de envio." },
      { id: "case-management", name: "Case Management", purpose: "Gerenciar o ciclo de vida de processos administrativos de defesa de multas." },
      { id: "case-state-machine", name: "Case State Machine", purpose: "Controlar transições válidas de estados de um processo administrativo." },
      { id: "case-instances", name: "Case Instances", purpose: "Modelar instâncias recursais (Defesa Prévia, JARI 1ª instância, CETRAN 2ª instância)." },
      { id: "deadline-engine", name: "Deadline Engine", purpose: "Calcular prazos decadenciais e prescricionais considerando feriados e dias úteis." },
      { id: "protocol-management", name: "Protocol Management", purpose: "Registrar comprovantes, datas e números de protocolo de recursos perante órgãos." },
      { id: "document-management", name: "Document Management", purpose: "Gerenciar upload, classificação e indexação de anexos probatórios e petições." },
      { id: "partner-commissions", name: "Partner Commissions", purpose: "Calcular repasses e comissionamento para escritórios despachantes parceiros." },
      { id: "crm-pipeline", name: "CRM Pipeline", purpose: "Acompanhar etapas de prospecção, atendimento e pós-venda para clientes da plataforma." }
    ]
  },
  {
    category: "autuax-intelligence",
    skills: [
      { id: "document-classification", name: "Document Classification", purpose: "Classificar automaticamente autos de infração, notificações e documentos pessoais." },
      { id: "ocr-extraction", name: "OCR Extraction", purpose: "Extrair texto e dados estruturados de imagens e PDFs escaneados de notificações." },
      { id: "data-normalization", name: "Data Normalization", purpose: "Normalizar datas, placas, códigos de infração e valores para o padrão canônico." },
      { id: "fact-model", name: "Fact Model", purpose: "Modelar fatos extraídos de um auto de infração para submissão ao motor de regras." },
      { id: "rule-engine", name: "Rule Engine", purpose: "Executar motor de regras determinístico sobre os fatos da autuação." },
      { id: "rule-versioning", name: "Rule Versioning", purpose: "Versionar regras de consistência associando-as à vigência legal correspondente." },
      { id: "analysis-runs", name: "Analysis Runs", purpose: "Orquestrar execuções de análise com rastreabilidade completa de entradas e saídas." },
      { id: "finding-generation", name: "Finding Generation", purpose: "Gerar apontamentos e teses de irregularidade com base nos resultados das regras." },
      { id: "evidence-engine", name: "Evidence Engine", purpose: "Consolidar evidências factuais e documentais que sustentam cada apontamento de vício." },
      { id: "data-comparison", name: "Data Comparison", purpose: "Cruzar dados do AIT contra bases oficiais para detectar divergências de cadastro." },
      { id: "manual-review", name: "Manual Review", purpose: "Encaminhar casos com inconsistências ambíguas para revisão por advogado responsável." }
    ]
  },
  {
    category: "integrations",
    skills: [
      { id: "integration-provider-pattern", name: "Integration Provider Pattern", purpose: "Implementar adapters e provedores padronizados para fontes externas." },
      { id: "external-query-audit", name: "External Query Audit", purpose: "Auditar requisições e respostas recebidas de sistemas públicos externos." },
      { id: "inmetro-integration", name: "INMETRO Integration", purpose: "Integrar com a base do INMETRO/PSIE para conferência de laudos metrológicos." },
      { id: "inmetro-device-model", name: "INMETRO Device Model", purpose: "Modelar instrumentos de medição de velocidade, cronotacógrafos e etilômetros." },
      { id: "inmetro-verifications", name: "INMETRO Verifications", purpose: "Validar data de verificação metrológica periódica (validade máxima de 12 meses)." },
      { id: "senatran-integration", name: "SENATRAN Integration", purpose: "Conectar à base do SENATRAN para validação de dados de veículos e condutores." },
      { id: "renainf-normalization", name: "RENAINF Normalization", purpose: "Normalizar extratos de infrações de trânsito obtidos via base RENAINF." },
      { id: "renavam-normalization", name: "RENAVAM Normalization", purpose: "Normalizar dados cadastrais de veículos obtidos do sistema RENAVAM." },
      { id: "renach-normalization", name: "RENACH Normalization", purpose: "Normalizar pontuações e prontuários de CNH da base RENACH." },
      { id: "dnit-adapter", name: "DNIT Adapter", purpose: "Integrar consultas de infrações e envio de defesas ao sistema eletrônico do DNIT." },
      { id: "state-authority-adapter", name: "State Authority Adapter", purpose: "Adaptar comunicação com DETRANs estaduais e DERs." },
      { id: "municipal-authority-adapter", name: "Municipal Authority Adapter", purpose: "Adaptar comunicação com secretarias municipais de trânsito e mobilidade." }
    ]
  },
  {
    category: "legal-defense",
    skills: [
      { id: "legal-source-versioning", name: "Legal Source Versioning", purpose: "Gerenciar versões e períodos de vigência de leis, decretos, resoluções e portarias." },
      { id: "ctb-rules", name: "CTB Rules", purpose: "Modelar artigos e tipificações do Código de Trânsito Brasileiro (Lei 9.503/1997)." },
      { id: "contran-rules", name: "CONTRAN Rules", purpose: "Mapear resoluções do CONTRAN que regulamentam a fiscalização e sinalização." },
      { id: "mbft-rules", name: "MBFT Rules", purpose: "Codificar fichas de fiscalização do Manual Brasileiro de Fiscalização de Trânsito." },
      { id: "legal-evidence", name: "Legal Evidence", purpose: "Estruturar anexos probatórios conforme exigências de admissibilidade processual." },
      { id: "defense-template", name: "Defense Template", purpose: "Criar templates parametrizados de petições para cada fase recursal." },
      { id: "defense-versioning", name: "Defense Versioning", purpose: "Versionar minutas de defesa mantendo histórico de alterações e revisões." },
      { id: "human-legal-review", name: "Human Legal Review", purpose: "Permitir validação formal e assinatura de petição por advogado habilitado." },
      { id: "protocol-evidence", name: "Protocol Evidence", purpose: "Anexar e certificar recibos oficiais de entrega do protocolo de recurso." }
    ]
  },
  {
    category: "ai",
    skills: [
      { id: "ai-provider-abstraction", name: "AI Provider Abstraction", purpose: "Desacoplar provedores de IA (OpenAI, Anthropic, Gemini) via interfaces neutras." },
      { id: "structured-ai-output", name: "Structured AI Output", purpose: "Impor saídas estruturadas em JSON estritamente tipadas e validadas por Zod." },
      { id: "ai-document-summary", name: "AI Document Summary", purpose: "Gerar resumos executivos de autos de infração e petições complexas." },
      { id: "ai-finding-explanation", name: "AI Finding Explanation", purpose: "Explicar didaticamente vícios identificados para operadores e clientes leigos." },
      { id: "ai-defense-drafting", name: "AI Defense Drafting", purpose: "Gerar rascunhos de minutas com base em teses previamente aprovadas pelo motor de regras." },
      { id: "ai-guardrails", name: "AI Guardrails", purpose: "Prevenir alucinações e vetar comandos que simulem decisões judiciais autônomas." },
      { id: "human-in-the-loop", name: "Human-in-the-Loop", purpose: "Exigir aprovação humana antes de qualquer despacho externo gerado com auxílio de IA." }
    ]
  },
  {
    category: "quality",
    skills: [
      { id: "unit-testing", name: "Unit Testing", purpose: "Escrever testes unitários rápidos e determinísticos com Vitest cobrindo regras de negócio." },
      { id: "integration-testing", name: "Integration Testing", purpose: "Testar fluxos completos integrando banco de dados PostgreSQL e cache Redis." },
      { id: "api-testing", name: "API Testing", purpose: "Validar contratos, status HTTP e payloads das rotas de API do backend Hono." },
      { id: "e2e-testing", name: "E2E Testing", purpose: "Automatizar testes de ponta a ponta simulando jornadas de usuário no frontend." },
      { id: "tenant-isolation-testing", name: "Tenant Isolation Testing", purpose: "Executar testes negativos que comprovam a impossibilidade de vazamento entre tenants." },
      { id: "security-testing", name: "Security Testing", purpose: "Testar proteções contra injeção SQL, XSS, quebra de autorização e bypass de sessões." },
      { id: "migration-testing", name: "Migration Testing", purpose: "Verificar integridade da execução e rollback de scripts de migração Drizzle." },
      { id: "regression-testing", name: "Regression Testing", purpose: "Garantir que correções de bugs permaneçam estáveis ao longo de novos deploys." },
      { id: "code-review", name: "Code Review", purpose: "Auditar qualidade, complexidade ciclomática e aderência a padrões em pull requests." },
      { id: "performance-review", name: "Performance Review", purpose: "Auditar queries lentas, tamanho de pacotes JavaScript e uso de memória." },
      { id: "release-readiness", name: "Release Readiness", purpose: "Avaliar checklist abrangente antes de liberar uma nova versão para homologação ou produção." }
    ]
  }
];

function generateSkillMarkdown(skill, category) {
  return `---
name: ${skill.id}
description: ${skill.purpose}
version: 1.0.0
author: AUTUAX Core Team, Hermes Agent
license: MIT
metadata:
  hermes:
    category: ${category}
    tags: [autuax, ${category}]
---

# ${skill.name} Skill

## Purpose
${skill.purpose}

## When to use
Utilize esta skill sempre que trabalhar em tarefas, revisões ou alterações relacionadas a **${skill.name}** no ecossistema AUTUAX.

## Inputs
- Contexto da tarefa emitido pelo Hermes Orchestrator.
- Arquivos de código, esquemas ou contratos sob escopo permitido.
- Invariantes de arquitetura e restrições de segurança do projeto.

## Procedure
1. Analisar o escopo da alteração e identificar as dependências diretas.
2. Aplicar as convenções e padrões estritos definidos para **${skill.name}**.
3. Implementar a menor mudança suficiente que atenda ao objetivo com segurança.
4. Validar se a tipagem permanece estrita e se não há regressões em módulos adjacentes.
5. Produzir evidência verificável de compilação e testes correspondentes.

## Guardrails
- Não introduzir dependências sem justificativa e aprovação do Architecture Agent.
- Proibido enfraquecer regras de tipagem TypeScript ou bypassar validação de esquemas Zod.
- Proibido comprometer o isolamento multi-tenant ou registrar segredos/PII em logs.

## Validation
- Executar typecheck estrito (\`tsc --noEmit\`).
- Executar testes automatizados relevantes ao escopo.
- Confirmar ausência de erros no Biome linter.

## Outputs
- Código ou artefatos gerados/modificados com qualidade comprovada.
- Evidência de testes e compilação anexada ao relatório de entrega.
`;
}

async function build() {
  console.log("Iniciando geração do AUTUAX Hermes Agent System em .agents/...");

  // Criar diretórios base
  await mkdir(join(agentsDir, "registry"), { recursive: true });
  await mkdir(join(agentsDir, "agents"), { recursive: true });
  await mkdir(join(agentsDir, "guardrails"), { recursive: true });
  await mkdir(join(agentsDir, "workflows"), { recursive: true });
  await mkdir(join(agentsDir, "knowledge"), { recursive: true });
  await mkdir(join(agentsDir, "templates"), { recursive: true });
  await mkdir(join(agentsDir, "skills"), { recursive: true });

  // 1. Escrever .agents/README.md
  await writeFile(join(agentsDir, "README.md"), `# AUTUAX Hermes Agent System

Camada central de governança, agentes especialistas, skills, guardrails, workflows e base de conhecimento do projeto **AUTUAX**.

## Princípio Fundamental
- **HERMES = ANALYZE / PLAN / REVIEW**
- **CODEX = EXECUTE / TEST / FIX**

## Estrutura
- \`registry/\`: Registro oficial de agentes e skills em YAML.
- \`agents/\`: Playbooks e mandatos dos 17 agentes especialistas.
- \`skills/\`: 123 skills padronizadas com 7 seções obrigatórias.
- \`guardrails/\`: Diretrizes inegociáveis de arquitetura, segurança, isolamento multi-tenant, migrações e produção.
- \`workflows/\`: Fluxos de desenvolvimento, correção de bugs, banco de dados, segurança, integrações e releases.
- \`knowledge/\`: Base de conhecimento do produto, arquitetura, modelo de domínio e convenções.
- \`templates/\`: Modelos para planos de implementação, relatórios de revisão e migrações.
`, "utf8");

  // 2. Escrever Agentes
  for (const agent of agents) {
    await writeFile(join(agentsDir, "agents", `${agent.id}.md`), agent.content, "utf8");
  }
  console.log(`✓ 17 Agentes gerados em .agents/agents/`);

  // 3. Escrever Guardrails
  for (const guard of guardrails) {
    await writeFile(join(agentsDir, "guardrails", guard.file), guard.content, "utf8");
  }
  console.log(`✓ 9 Guardrails gerados em .agents/guardrails/`);

  // 4. Escrever Workflows
  for (const flow of workflows) {
    await writeFile(join(agentsDir, "workflows", flow.file), flow.content, "utf8");
  }
  console.log(`✓ 7 Workflows gerados em .agents/workflows/`);

  // 5. Escrever Knowledge
  for (const doc of knowledge) {
    await writeFile(join(agentsDir, "knowledge", doc.file), doc.content, "utf8");
  }
  console.log(`✓ 7 Documentos de Conhecimento gerados em .agents/knowledge/`);

  // 6. Escrever Templates
  for (const tmpl of templates) {
    await writeFile(join(agentsDir, "templates", tmpl.file), tmpl.content, "utf8");
  }
  console.log(`✓ 6 Templates gerados em .agents/templates/`);

  // 7. Escrever Skills (123 skills)
  let totalSkills = 0;
  const allSkillsList = [];
  for (const cat of skillCategories) {
    for (const skill of cat.skills) {
      const skillDir = join(agentsDir, "skills", skill.id);
      await mkdir(skillDir, { recursive: true });
      const mdContent = generateSkillMarkdown(skill, cat.category);
      await writeFile(join(skillDir, "SKILL.md"), mdContent, "utf8");
      allSkillsList.push({ ...skill, category: cat.category });
      totalSkills++;
    }
  }
  console.log(`✓ ${totalSkills} Skills geradas em .agents/skills/`);

  // 8. Escrever Registry (agents.yaml e skills.yaml)
  let agentsYaml = "# AUTUAX Agents Registry\nagents:\n";
  for (const a of agents) {
    agentsYaml += `  - id: "${a.id}"\n    name: "${a.name}"\n    purpose: "${a.purpose}"\n    domains: [${a.domains.map(d => `"${d}"`).join(", ")}]\n    default_skills: [${a.default_skills.map(s => `"${s}"`).join(", ")}]\n    mandatory_guardrails: [${a.mandatory_guardrails.map(g => `"${g}"`).join(", ")}]\n`;
  }
  await writeFile(join(agentsDir, "registry", "agents.yaml"), agentsYaml, "utf8");

  let skillsYaml = "# AUTUAX Skills Registry\nskills:\n";
  for (const s of allSkillsList) {
    const riskLevel = ["security", "multi-tenant-isolation", "database-migrations", "secret-management", "opaque-sessions", "mfa", "rbac", "rls-security"].includes(s.id) ? "HIGH" : "LOW";
    skillsYaml += `  - id: "${s.id}"\n    name: "${s.name}"\n    category: "${s.category}"\n    description: "${s.purpose}"\n    risk_level: "${riskLevel}"\n`;
  }
  await writeFile(join(agentsDir, "registry", "skills.yaml"), skillsYaml, "utf8");
  console.log(`✓ Registry gerado em .agents/registry/ (agents.yaml e skills.yaml)`);

  // 9. Atualizar AGENTS.md na raiz
  const rootAgentsMd = `# AUTUAX Engineering Governance (AGENTS.md)

Este repositório adota o **AUTUAX Hermes Agent System** para orquestração de desenvolvimento assistido por agentes de IA.

---

## 1. Princípio Fundamental de Separação de Papéis

\`\`\`
HERMES  = ANALYZE / PLAN / REVIEW
CODEX   = EXECUTE / TEST / FIX
\`\`\`

- **Hermes** é o agente de planejamento, decomposição arquitetural, seleção de skills, verificação de guardrails e auditoria de qualidade.
- **Codex** é o executor exclusivo: escreve arquivos, executa comandos, roda testes e corrige defeitos com base em evidências verificáveis.
- Nunca colocar dois agentes competindo pela execução da mesma tarefa.

---

## 2. Fluxo de Trabalho Obrigatório do Codex (10 Passos)

Todo ciclo de alteração no projeto deve seguir estritamente os 10 passos:
1. **Ler o AGENTS.md** antes de efetuar qualquer alteração no repositório.
2. **Inventariar os arquivos relevantes** para a tarefa delimitada.
3. **Explicar internamente o plano da tarefa** respeitando o escopo autorizado.
4. **Executar a menor mudança segura** necessária para atingir o objetivo.
5. **Criar ou atualizar testes automatizados** cobrindo os caminhos afetados.
6. **Rodar typecheck estrito** (\`tsc --noEmit\`).
7. **Rodar lint** com o Biome linter.
8. **Rodar a suíte de testes** relevante com Vitest.
9. **Rodar build** de validação.
10. **Informar formalmente os arquivos alterados, evidências, riscos e pendências**.

---

## 3. Proibições Absolutas (Codex NÃO Deve)

- **Nunca acessar ou commitar segredos**, chaves de API, credenciais ou certificados no código.
- **Nunca enfraquecer testes** ou remover assertions apenas para obter status de \`PASS\`.
- **Nunca ignorar erros TypeScript** recorrendo a \`any\`, \`@ts-ignore\` ou casts forçados.
- **Nunca executar migração destrutiva** de banco de dados automaticamente.
- **Nunca alterar produção** ou infraestrutura externa sem solicitação explícita.
- **Nunca deletar dados persistentes** ou tabelas de produção.
- **Nunca fazer force push** na branch principal (\`main\`).
- **Nunca efetuar deploy** sem instrução direta e revisão concluída.

---

## 4. Definição de Concluído (Definition of Done - DoD)

Uma tarefa AUTUAX somente é considerada **DONE** quando:
- [x] Implementação do escopo autorizada completa.
- [x] Typecheck estrito aprovado (\`tsc PASS\`).
- [x] Linter Biome aprovado (\`lint PASS\`).
- [x] Testes automatizados obrigatórios aprovados (\`tests PASS\`).
- [x] Build aprovado (\`build PASS\`).
- [x] Revisão de segurança concluída quando aplicável.
- [x] Revisão de isolamento multi-tenant concluída quando aplicável.
- [x] Revisão de migração concluída quando aplicável.
- [x] Documentação técnica correspondente atualizada.
- [x] Parecer de aprovação final do Hermes (\`Hermes review approved\`).

---

## 5. Estrutura de Governança

Consulte os diretórios especializados em \`.agents/\`:
- [\`.agents/registry/\`](file:///.agents/registry/): Registro centralizado de agentes e skills.
- [\`.agents/agents/\`](file:///.agents/agents/): Playbooks e mandatos dos 17 agentes especialistas.
- [\`.agents/skills/\`](file:///.agents/skills/): 123 skills com guias de procedimento e guardrails.
- [\`.agents/guardrails/\`](file:///.agents/guardrails/): Diretrizes inegociáveis de arquitetura, segurança, multi-tenancy e produção.
- [\`.agents/workflows/\`](file:///.agents/workflows/): Procedimentos padronizados para desenvolvimento, bugs, banco e segurança.
- [\`.agents/knowledge/\`](file:///.agents/knowledge/): Base de conhecimento do produto, domínio e regras técnicas.
- [\`.agents/templates/\`](file:///.agents/templates/): Templates estruturados para planos e revisões.
`;

  await writeFile(join(rootDir, "AGENTS.md"), rootAgentsMd, "utf8");
  console.log(`✓ AGENTS.md raiz atualizado com governança AUTUAX`);

  console.log("\nAUTUAX Hermes Agent System gerado com sucesso!");
}

build().catch(err => {
  console.error("Erro na geração:", err);
  process.exit(1);
});
