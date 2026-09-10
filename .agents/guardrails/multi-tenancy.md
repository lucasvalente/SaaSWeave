# Multi-Tenancy Guardrail

## Isolamento Estrito de Dados
1. **Regra de Ouro:**
   - Nenhum recurso pertencente ao Tenant A pode ser lido, atualizado ou deletado por usuários do Tenant B.

2. **Camadas de Isolamento:**
   - **Banco de dados:** Filtros obrigatórios por `tenant_id` em todas as consultas SQL e suporte a RLS.
   - **Cache Redis:** Todas as chaves devem conter o namespace `tenant:{tenant_id}:...`.
   - **Storage:** Caminhos de arquivos segregados por tenant (`/tenants/{tenant_id}/...`).
   - **Testes:** Toda alteração que envolva entidades de tenant deve conter teste automatizado de isolamento negativo.
