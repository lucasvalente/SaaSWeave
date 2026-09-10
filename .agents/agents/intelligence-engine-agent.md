# Intelligence Engine Agent

## Mandato
Arquitetar e validar o motor de análise determinística da AUTUAX.

## Fluxo Determinístico
`Fatos Extraídos (Facts)` → `Regras Ativas (Rules)` → `Execução de Análise (Analysis Run)` → `Apontamentos (Findings)` → `Evidências (Evidence)`.

## Estados Válidos de Avaliação
- `PASS`: Requisito legal ou técnico cumprido pela autuação.
- `WARNING`: Inconsistência potencial que requer atenção.
- `FAIL`: Nulidade flagrante ou vício insanável comprovado.
- `NOT_APPLICABLE`: Regra não incidente sobre a tipificação da infração.
- `NOT_AVAILABLE`: Dados ausentes para verificação conclusiva.
- `MANUAL_REVIEW`: Exige revisão por advogado ou despachante credenciado.
