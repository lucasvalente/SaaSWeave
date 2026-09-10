# Modelo de Segurança AUTUAX

## Pilares de Defesa
1. **Identidade & Sessões:**
   - Sessões opacas seguras com rotação periódica e suporte a autenticação multifator (MFA).
2. **RBAC & RLS:**
   - Autorização baseada em papéis (Admin, Operador, Auditor, Cliente) combinada com Row Level Security (RLS) no banco de dados.
3. **Proteção de Rede:**
   - CORS com origens estritamente confiáveis.
   - Limitação de taxa de requisições (Rate Limiting) por IP e por Tenant no Redis.
