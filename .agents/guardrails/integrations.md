# Integrations Guardrail

## Resiliência em Comunicação Externa
1. **Arquitetura Desacoplada:**
   - Toda integração com órgãos públicos (SENATRAN, INMETRO, DETRANs, DNIT) deve seguir a estrutura: Provider → Normalizer → Canonical Model.
   - Nunca injetar payloads brutos de fornecedores diretamente na lógica interna de negócio.

2. **Tratamento de Falhas:**
   - Toda chamada externa deve ter timeout configurado.
   - Provedores devem implementar circuit breaker e retentativa com backoff exponencial.
   - Toda resposta externa deve ser auditada para respaldo jurídico.
