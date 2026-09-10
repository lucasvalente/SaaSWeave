# Workflow: Database Change

## Etapas Obrigatórias
1. **Modelagem de Esquema:**
   - `database-agent` avalia mudanças em `packages/database/src/schema`.
2. **Classificação de Risco:**
   - Definir classificação (`SAFE`, `CAUTION` ou `DESTRUCTIVE`).
3. **Geração da Migração:**
   - Gerar arquivos via `bun db:generate` ou ferramenta Drizzle.
4. **Validação de Rollback:**
   - Documentar procedimento de reversão sem perda de dados.
5. **Execução de Testes:**
   - Validar migração em banco temporário de testes.
