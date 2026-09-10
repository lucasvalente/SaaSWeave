# Workflow: Release Hardening

## Etapas Obrigatórias
1. **Verificação de Gates de Qualidade:**
   - Typecheck estrito (`tsc`), Biome lint e suíte completa de testes unitários/integração.
2. **Auditoria de Migrações Pendentes:**
   - Confirmar ausência de migrações destrutivas não preparadas.
3. **Verificação de Variáveis de Ambiente:**
   - Validar schemas de configuração via Zod para o ambiente de destino.
4. **Emissão do Relatório de Prontidão:**
   - `release-agent` compila o relatório formal de release.
