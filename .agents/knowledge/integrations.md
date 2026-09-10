# Arquitetura de Integrações Externas

## Provedores Alvo
- **INMETRO / PSIE:** Consulta de instrumentos de medição e validade de laudos metrológicos de radares.
- **SENATRAN (antigo DENATRAN):** Consulta nacional de veículos (RENAVAM) e condutores (RENACH).
- **RENAINF:** Registro Nacional de Infrações de Trânsito para autuações interestaduais.
- **DNIT & DERs:** Órgãos rodoviários federais e estaduais para consulta de editais e notificações.

## Princípios
- Toda integração deve operar com timeout explícito e isolamento em sandbox de dados.
- Mocks fiéis devem estar disponíveis para todos os testes em ambiente local de desenvolvimento.
