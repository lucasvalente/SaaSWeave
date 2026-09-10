# Database Guardrail

## Regras de Banco de Dados
1. **Modelagem:**
   - Toda tabela pertencente a um tenant deve possuir coluna obrigatória `tenant_id` com integridade referencial.
   - Usar campos temporais padronizados com fuso horário (`timestamptz`).
   - Criar índices para todas as chaves estrangeiras e campos de filtro frequente.

2. **Operações e Conexões:**
   - Utilizar pool de conexões centralizado em `packages/database`. Nunca instanciar clientes independentes em cada rota.
   - Usar transações atômicas para operações de múltiplas tabelas.
