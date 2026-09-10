# Workflow: Bug Fix

## Etapas Obrigatórias
1. **Reprodução:**
   - Isolar o cenário de falha e escrever um teste automatizado que falhe comprovando o defeito.
2. **Identificação da Causa Raiz:**
   - Evitar patches superficiais ou suposições sem rastreamento nos logs ou código.
3. **Correção Mínima Segura:**
   - Aplicar a menor mudança de código suficiente para sanar o problema sem efeitos colaterais.
4. **Teste de Regressão:**
   - O teste inicialmente falho agora deve passar (`PASS`), junto com todos os testes existentes.
5. **Revisão:**
   - Registro da causa raiz, solução adotada e garantia de não-regressão.
