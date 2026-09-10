# AUTUAX — Plataforma SaaS B2B de Gestão de Infrações

> Plataforma SaaS B2B multi-tenant de inteligência, gestão e automação de infrações de trânsito.

---

## 1. Visão Geral e Arquitetura

O **AUTUAX** foi desenhado sob uma arquitetura modular, tipada de ponta a ponta e de altíssima performance:

```
Browser
   ↓
TanStack Start (apps/web)
   ↓
Typed API Client (@autuax/contracts)
   ↓
Hono API (apps/api — Bun Runtime)
   ↓
Application & Domain Services
   ↓
PostgreSQL 16 (@autuax/database) + Redis 7
   ↑
Worker Process (apps/worker — Bun Runtime)
```

---

## 2. Stack Tecnológica Oficial

- **Linguagem:** TypeScript strict de ponta a ponta.
- **Frontend (`apps/web`):** TanStack Start, React 19, TanStack Router, TanStack Query, Zustand, TanStack Store e TailwindCSS.
- **Design System (`packages/ui`):** Componentes shadcn-style (`Button`, `Card`, `Badge`) com tokens centralizados de design.
- **Backend (`apps/api`):** Hono sob Bun, OpenAPI 3.1, validação Zod.
- **Banco de Dados (`packages/database`):** PostgreSQL 16 gerenciado com Drizzle ORM e Drizzle Kit.
- **Cache & Filas:** Redis 7 com suporte a namespaces (`session:`, `cache:`, `lock:`, `queue:`, `rate-limit:`).
- **Processamento Assíncrono (`apps/worker`):** Worker daemon em Bun com ciclo de vida e graceful shutdown.
- **Observabilidade (`packages/observability`):** OpenTelemetry, Prometheus (`prom-client`), logs JSON estruturados com redaction para PII e LGPD.
- **Monorepo:** Bun Workspaces + TurboRepo.
- **Qualidade & Testes:** Vitest e Biome linter/formatter.

---

## 3. Estrutura do Monorepo

```
autuax/
│
├── apps/
│   ├── web/          # Aplicação frontend TanStack Start
│   ├── api/          # Servidor HTTP Hono sob Bun
│   └── worker/       # Processo de workers em segundo plano
│
├── packages/
│   ├── ui/           # Design System e primitives React
│   ├── database/     # Cliente PostgreSQL 16, Drizzle e Redis 7
│   ├── contracts/    # Schemas Zod, DTOs e Typed API Client
│   ├── config/       # Validação de variáveis de ambiente com Zod
│   ├── observability/# Métricas Prometheus, OpenTelemetry e Logs
│   └── shared/       # Utilitários compartilhados universais
│
├── infrastructure/
│   └── docker/       # docker-compose.yml (Postgres 16 + Redis 7)
│
├── docs/
│   ├── architecture/ # Políticas de migrações e padrões arquiteturais
│   └── adr/          # Architecture Decision Records (ADR-001 a ADR-009)
│
├── .agents/          # Governança Hermes Agent System (17 agentes, 121 skills)
├── .hermes/          # Camada de runtime e integração do Hermes
├── AGENTS.md         # Diretrizes inegociáveis de engenharia
├── turbo.json        # Orquestrador TurboRepo
├── biome.json        # Configuração do linter e formatter Biome
└── package.json
```

---

## 4. Instalação e Configuração

### Pré-requisitos
- [Bun](https://bun.sh/) (v1.2+)
- [Docker](https://www.docker.com/) e Docker Compose

### 1. Clonar e Instalar Dependências
```bash
bun install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo para a raiz:
```bash
cp .env.example .env
```

### 3. Iniciar Infraestrutura Local (PostgreSQL 16 e Redis 7)
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

---

## 5. Comandos do Monorepo

Todos os comandos são orquestrados de forma unificada:

| Comando | Descrição |
| --- | --- |
| `bun dev` | Inicia todos os serviços (`apps/web`, `apps/api`, `apps/worker`) em modo de desenvolvimento |
| `bun build` | Executa o build de produção via TurboRepo |
| `bun typecheck` | Executa a validação estrita de tipos com TypeScript (`tsc --noEmit`) |
| `bun lint` | Executa o linter Biome em todo o repositório |
| `bun lint:fix` | Corrige problemas automáticos de formatação e lint com o Biome |
| `bun test` | Executa toda a suíte de testes automatizados com o Vitest |
| `bun db:generate` | Gera novas migrações SQL com o Drizzle Kit |
| `bun db:migrate` | Aplica migrações pendentes no PostgreSQL |
| `bun db:status` | Verifica a integridade e estado das tabelas do banco de dados |

---

## 6. Endpoints Principais da API (`apps/api`)

- `GET /health` — Verificação básica de status da API.
- `GET /health/live` — Liveness probe (uptime e processo ativo).
- `GET /health/ready` — Readiness probe (testa conexões com PostgreSQL e Redis). Retorna HTTP 200 se saudável ou 503 se uma dependência estiver offline.
- `GET /version` — Informações da versão atual e ambiente (`development`, `production`).
- `GET /openapi.json` — Especificação completa da API em OpenAPI 3.1.
- `GET /metrics` — Exposição de métricas no padrão Prometheus.

---

## 7. Governança Hermes & Codex

Este projeto adota o **AUTUAX Hermes Agent System**:
- **HERMES = ANALYZE / PLAN / REVIEW**
- **CODEX = EXECUTE / TEST / FIX**

Consulte [`AGENTS.md`](file:///AGENTS.md) e o diretório [`.agents/`](file:///.agents/) para playbooks detalhados.
