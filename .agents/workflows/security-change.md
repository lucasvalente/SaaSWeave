# Workflow: Security Change

## Etapas Obrigatórias
1. **Avaliação Inicial (Security Agent):**
   - Obrigatório para qualquer mudança em autenticação, MFA, RBAC, RLS, sessões ou permissões.
2. **Análise de Ameaças:**
   - Avaliar riscos de escalonamento de privilégio, bypass de tenant e vazamento de tokens.
3. **Implementação com Testes Negativos:**
   - Escrever testes específicos que tentam burlar a nova regra de segurança.
4. **Auditoria Dupla:**
   - Revisão aprovada por `security-agent` e homologada por `code-review-agent`.
