# Workflow: Feature Development

## Etapas Obrigatórias
1. **Análise de Requisitos (Hermes Orchestrator):**
   - Recebe a solicitação e delimita o escopo técnico.
   - Convocação de agentes especialistas (ex: `domain-traffic-agent`, `backend-agent`, `frontend-agent`).
   - Identificação de riscos e consulta a guardrails.
2. **Geração do Plano (Hermes):**
   - Emissão do `CODEX EXECUTION PLAN` com escopo estrito, arquivos afetados e critérios de parada.
3. **Execução Técnica (Codex):**
   - Criação ou alteração incremental de arquivos.
   - Execução dos testes automatizados e typecheck.
4. **Validação & Evidências (Testing Agent & Codex):**
   - Coleta de logs de execução e cobertura de testes.
5. **Revisão Técnica (Code Review Agent & Security Agent):**
   - Avaliação de segurança, isolamento e qualidade.
6. **Aprovação Final (Hermes):**
   - Emissão do parecer conclusivo e fechamento do ciclo.
