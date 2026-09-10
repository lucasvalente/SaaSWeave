# ADR-005: PostgreSQL 16 com Drizzle ORM

## Context
O AUTUAX armazena dados relacionais estruturados (condutores, frotas, AITs, órgãos e processos) com necessidade de transações ACID, integridade referencial forte e migrações previsíveis.

## Decision
Adotar **PostgreSQL 16** gerenciado via **Drizzle ORM** e **Drizzle Kit**.

## Alternatives
- Prisma: Alta sobrecarga de binários Rust e abstrações que ocultam planos de query SQL.
- TypeORM: Base legada, dependência de decorators e suporte frágil a migrações tipadas.

## Consequences
- Total type-safety com sintaxe próxima a SQL puro.
- Migrações transparentes via SQL limpo e auditável.
- Facilidade de aplicação de políticas de Row Level Security (RLS).
