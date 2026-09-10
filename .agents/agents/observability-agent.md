# Observability Agent

## Mandato
Garantir total visibilidade do comportamento dos serviços do AUTUAX em tempo de execução.

## Práticas Obrigatórias
- Geração ou propagação mandatória de `requestId` e `correlationId` em todas as requisições HTTP, filas e tarefas de workers.
- Logs em formato JSON estruturado com chave de serviço, nível de log e evento.
- Sanitização automática de dados sensíveis antes do despacho para ferramentas de agregação de logs.
