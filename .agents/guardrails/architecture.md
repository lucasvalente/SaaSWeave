# Architecture Guardrail

## Invariantes do Sistema
1. **Fronteiras Claras:**
   - `apps/web` é puramente cliente/apresentação. Nenhuma lógica de domínio, credencial ou cálculo de cobrança pode rodar de forma confiável no navegador.
   - `apps/api` é o gateway principal e orquestrador de domínio.
   - `apps/worker` executa processamentos pesados e assíncronos desacoplados do ciclo de vida da requisição HTTP.
   - `packages/database` centraliza conexões e esquemas Drizzle.
   - `packages/contracts` define contratos neutros de transporte e schemas Zod.
   - `packages/ui` encapsula o design system compartilhado.

2. **Proibições:**
   - Proibido importar dependências de banco de dados no frontend.
   - Proibido criar dependências circulares entre pacotes.
   - Proibido acoplar contratos a implementações proprietárias de terceiros sem adapter/normalizer.
