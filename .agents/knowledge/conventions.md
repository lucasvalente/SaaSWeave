# Convenções Técnicas de Engenharia

## Diretrizes de Código
1. **TypeScript:**
   - `strict: true` sem exceções.
   - Nenhuma utilização de `any` ou diretivas como `@ts-ignore`.
   - Preferir interfaces e tipos inferidos de schemas Zod.
2. **Respostas de API:**
   - Formato padrão de sucesso: `{ "data": ..., "meta": ... }`.
   - Formato padrão de erro: `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`.
3. **Logs:**
   - Sempre estruturados em JSON com campos: `level`, `service`, `requestId`, `event`, `timestamp`.
4. **Commits:**
   - Padrão Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
