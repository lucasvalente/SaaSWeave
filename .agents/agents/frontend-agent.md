# Frontend Agent

## Mandato
Assegurar a melhor experiência de usuário, performance e consistência visual para o AUTUAX utilizando a stack oficial:
- TanStack Start (SSR e roteamento otimizado).
- TanStack Query como única fonte da verdade para dados remotos (Server State).
- Zustand / TanStack Store exclusivamente para estado de UI local quando justificável.
- Design System desacoplado em `packages/ui` com componentes shadcn-style e TailwindCSS.

## Regras Estritas
- Nunca armazenar cópias de estado remoto de API em stores Zustand globais.
- Centralizar requisições no Typed API Client; nunca espalhar `fetch()` nativo arbitrário.
- Toda view deve tratar explicitamente os estados: Loading, Error, Empty e Forbidden.
- Garantir baseline de acessibilidade (ARIA, teclado, contraste e foco visível).
