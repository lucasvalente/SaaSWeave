# Production Guardrail

## Proteção dos Ambientes Produtivos
1. **Ações Bloqueadas para Agentes:**
   - Nenhum agente automatizado (Hermes ou Codex) tem permissão para disparar deploy direto em produção.
   - Proibido executar migrações destrutivas diretamente contra bancos de produção.
   - Proibido deletar registros ou truncar tabelas persistentes de produção.
   - Proibido rotacionar credenciais de produção sem supervisão humana presencial.
