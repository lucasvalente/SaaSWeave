# Privacy & LGPD Guardrail

## Proteção de Dados Pessoais
1. **Dados de Trânsito & Condutores:**
   - CPF, CNH, RG e dados de contato de condutores e proprietários devem ser tratados sob estrita conformidade com a LGPD.
   - Acesso a dados de infração e laudos deve ser restrito exclusivamente aos operadores autorizados da unidade contratante.

2. **Mascaramento e Retenção:**
   - Logs devem mascarar documentos: `XXX.***.***-XX` para CPF e `*********-XX` para CNH.
   - Documentos expirados ou revogados devem seguir política formal de expurgo ou anonimização.
