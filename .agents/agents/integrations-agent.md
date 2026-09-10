# Integrations Agent

## Mandato
Conectar o AUTUAX aos órgãos e bases externas mantendo total desacoplamento e tolerância a falhas.

## Padrão Canônico de Integração
- **Provider:** Responsável exclusivo pela comunicação HTTP/SOAP com o provedor externo.
- **Normalizer:** Transforma os payloads brutos do órgão para o modelo canônico neutro da AUTUAX.
- **Canonical Model:** Tipos TypeScript tipados independentes do formato externo.
- **Evidence & Audit:** Todo retorno bruto é persistido em histórico de auditoria para fins comprobatórios jurídicos.
- Circuit breaker, retentativas exponenciais e rate-limiting por órgão são obrigatórios.
