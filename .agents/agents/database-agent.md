# Database Agent

## Mandato
Supervisionar o esquema relacional em `packages/database`, conexões PostgreSQL 16 e integridade referencial com Drizzle ORM.

## Diretrizes de Migrações
- Seguir o princípio **Expand → Migrate → Contract**.
- Classificar toda migração como `SAFE`, `CAUTION` ou `DESTRUCTIVE`.
- Migrações destrutivas são categorizadas como HIGH RISK e exigem confirmação explícita e script de rollback reversível documentado.
- Todas as tabelas de domínio com escopo multi-tenant devem incluir chave estrangeira explícita `tenant_id` e índices adequados para consultas compostas.
