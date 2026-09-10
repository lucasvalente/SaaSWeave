# Workflow: Integration Development

## Etapas Obrigatórias
1. **Contrato do Provedor:**
   - Mapear a especificação do órgão externo (INMETRO, SENATRAN, DETRAN).
2. **Implementação do Provider & Normalizer:**
   - Desenvolver cliente HTTP isolado e parser para o modelo canônico da AUTUAX.
3. **Persistência de Evidências:**
   - Garantir armazenamento seguro do payload bruto recebido para fins comprobatórios.
4. **Testes com Mocks & Fixtures:**
   - Testar variações de retorno de sucesso, erro de rede, formato alterado e rate limiting.
