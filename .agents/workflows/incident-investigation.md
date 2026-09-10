# Workflow: Incident Investigation

## Etapas Obrigatórias
1. **Identificação & Contenção:**
   - Localizar `requestId` ou `correlationId` associado ao incidente nos logs agregados.
2. **Correlação de Métricas & Tracing:**
   - Inspecionar métricas Prometheus e spans OpenTelemetry para determinar o gargalo ou componente em falha.
3. **Mitigação Rápida:**
   - Aplicar rollback, circuit breaking ou ativação de feature flag.
4. **Post-Mortem & Plano de Ação:**
   - Elaborar relatório com cronologia, impacto, causa raiz e medidas corretivas definitivas.
