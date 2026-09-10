# ADR-001: Adoção de Monorepo com Bun Workspaces e TurboRepo

## Context
A plataforma AUTUAX é composta por múltiplos componentes (frontend web, API backend, worker assíncrono e pacotes compartilhados de contratos, banco de dados e UI). Manter repositórios separados geraria atrito na sincronização de contratos e duplicação de tipos.

## Decision
Adotamos a arquitetura de **Monorepo** orquestrado por **Bun Workspaces** e **TurboRepo**.

## Alternatives
- Repositórios separados (Polyrepo): Complexidade na sincronização de tipos e deploys.
- Monorepo com Lerna/Nx: Sobrerecuo de configuração em relação ao TurboRepo e Bun nativo.

## Consequences
- Compartilhamento atômico de contratos Zod e tipos TypeScript entre frontend e backend.
- Execução em pipeline paralela com cache inteligente via TurboRepo.
- Dependência estrita do Bun como runtime de alta performance.
