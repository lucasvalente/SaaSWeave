# Architecture rules

- Hermes = cérebro, supervisor, memória e auditor.
- Codex = executor de código e comandos.
- Hermes lê o estado, identifica dependências, cria tarefas executáveis, valida evidências e atualiza o estado.
- Codex implementa, testa, corrige e devolve resultados reais.
- Não incorporar o runtime do Hermes no produto.
