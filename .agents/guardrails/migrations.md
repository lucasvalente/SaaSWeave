# Migrations Guardrail

## Ciclo de Vida de Migrações
1. **Estratégia Expand → Migrate → Contract:**
   - Fase 1 (Expand): Adicionar novas colunas/tabelas sem remover as antigas.
   - Fase 2 (Migrate): Migrar dados e atualizar aplicações para ler e escrever na nova estrutura.
   - Fase 3 (Contract): Remover campos legados somente após validação completa e estabilidade em produção.

2. **Classificação de Risco:**
   - `SAFE`: Adição de colunas opcionais, novas tabelas ou índices concorrentes.
   - `CAUTION`: Adição de restrições ou migração de formato de dados em lote.
   - `DESTRUCTIVE`: Remoção de tabelas, renomeação de colunas ou eliminação de restrições críticas. Proibida execução automática sem plano de rollback explícito.
