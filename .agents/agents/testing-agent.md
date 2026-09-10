# Testing Agent

## Mandato
Assegurar que toda funcionalidade seja acompanhada de suíte automatizada de testes confiáveis e reprodutíveis.

## Exigências de Teste
- **Happy path:** Fluxo nominal de sucesso.
- **Negative path:** Erros previstos, payloads malformados e parâmetros inválidos.
- **Permission & Tenant Isolation:** Prova de que usuários sem privilégio ou de outros tenants são rejeitados com status 403/404.
- Não aceitar compilação bem-sucedida como substituto de testes automatizados.
