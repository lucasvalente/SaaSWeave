# Security Guardrail

## Regras Inegociáveis de Segurança
1. **Autenticação & Autorização:**
   - Nunca desabilitar ou enfraquecer verificações de autenticação ou RBAC para resolver testes ou bugs.
   - O identificador do tenant (`tenant_id`) deve sempre ser derivado e validado a partir da sessão/token confiável no servidor, nunca confiado do corpo ou cabeçalho do cliente sem verificação.
   - Toda rota autenticada deve aplicar validação de permissão explícita baseada no perfil e papel do usuário.

2. **Proteção de Segredos e PII:**
   - Nunca commitar senhas, tokens de API ou certificados no repositório.
   - Nunca registrar em logs senhas, tokens, cookies, CPF, CNH ou dados pessoais sensíveis (LGPD).
   - Utilizar sanitização/redaction centralizada em todos os emissores de logs.
