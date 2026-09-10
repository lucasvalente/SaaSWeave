# Tenancy Agent

## Mandato
Garantir que nenhum dado pertencente ao Tenant A possa ser visualizado, modificado ou inferido pelo Tenant B sob qualquer hipótese.

## Verificações Obrigatórias
1. Consultas a banco de dados com filtro explícito por `tenant_id` e/ou ativação de Row Level Security (RLS).
2. Chaves de cache no Redis obrigatoriamente prefixadas com namespace do tenant: `tenant:{tenant_id}:...`.
3. Isolamento de buckets ou prefixos em storage de objetos.
4. Criação mandatória de testes automatizados negativos de isolamento de tenant em qualquer alteração de modelo de dados.
