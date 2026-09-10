# AUTUAX Engineering Governance (AGENTS.md)

Este repositório adota o **AUTUAX Hermes Agent System** para orquestração de desenvolvimento assistido por agentes de IA.

---

## 1. Princípio Fundamental de Separação de Papéis

```
HERMES  = ANALYZE / PLAN / REVIEW
CODEX   = EXECUTE / TEST / FIX
```

- **Hermes** é o agente de planejamento, decomposição arquitetural, seleção de skills, verificação de guardrails e auditoria de qualidade.
- **Codex** é o executor exclusivo: escreve arquivos, executa comandos, roda testes e corrige defeitos com base em evidências verificáveis.
- Nunca colocar dois agentes competindo pela execução da mesma tarefa.

---

## 2. Fluxo de Trabalho Obrigatório do Codex (10 Passos)

Todo ciclo de alteração no projeto deve seguir estritamente os 10 passos:
1. **Ler o AGENTS.md** antes de efetuar qualquer alteração no repositório.
2. **Inventariar os arquivos relevantes** para a tarefa delimitada.
3. **Explicar internamente o plano da tarefa** respeitando o escopo autorizado.
4. **Executar a menor mudança segura** necessária para atingir o objetivo.
5. **Criar ou atualizar testes automatizados** cobrindo os caminhos afetados.
6. **Rodar typecheck estrito** (`tsc --noEmit`).
7. **Rodar lint** com o Biome linter.
8. **Rodar a suíte de testes** relevante com Vitest.
9. **Rodar build** de validação.
10. **Informar formalmente os arquivos alterados, evidências, riscos e pendências**.

---

## 3. Proibições Absolutas (Codex NÃO Deve)

- **Nunca acessar ou commitar segredos**, chaves de API, credenciais ou certificados no código.
- **Nunca enfraquecer testes** ou remover assertions apenas para obter status de `PASS`.
- **Nunca ignorar erros TypeScript** recorrendo a `any`, `@ts-ignore` ou casts forçados.
- **Nunca executar migração destrutiva** de banco de dados automaticamente.
- **Nunca alterar produção** ou infraestrutura externa sem solicitação explícita.
- **Nunca deletar dados persistentes** ou tabelas de produção.
- **Nunca fazer force push** na branch principal (`main`).
- **Nunca efetuar deploy** sem instrução direta e revisão concluída.

---

## 4. Definição de Concluído (Definition of Done - DoD)

Uma tarefa AUTUAX somente é considerada **DONE** quando:
- [x] Implementação do escopo autorizada completa.
- [x] Typecheck estrito aprovado (`tsc PASS`).
- [x] Linter Biome aprovado (`lint PASS`).
- [x] Testes automatizados obrigatórios aprovados (`tests PASS`).
- [x] Build aprovado (`build PASS`).
- [x] Revisão de segurança concluída quando aplicável.
- [x] Revisão de isolamento multi-tenant concluída quando aplicável.
- [x] Revisão de migração concluída quando aplicável.
- [x] Documentação técnica correspondente atualizada.
- [x] Parecer de aprovação final do Hermes (`Hermes review approved`).

---

## 5. Estrutura de Governança

Consulte os diretórios especializados em `.agents/`:
- [`.agents/registry/`](file:///.agents/registry/): Registro centralizado de agentes e skills.
- [`.agents/agents/`](file:///.agents/agents/): Playbooks e mandatos dos 17 agentes especialistas.
- [`.agents/skills/`](file:///.agents/skills/): 123 skills com guias de procedimento e guardrails.
- [`.agents/guardrails/`](file:///.agents/guardrails/): Diretrizes inegociáveis de arquitetura, segurança, multi-tenancy e produção.
- [`.agents/workflows/`](file:///.agents/workflows/): Procedimentos padronizados para desenvolvimento, bugs, banco e segurança.
- [`.agents/knowledge/`](file:///.agents/knowledge/): Base de conhecimento do produto, domínio e regras técnicas.
- [`.agents/templates/`](file:///.agents/templates/): Templates estruturados para planos e revisões.

---

## 6. Diretrizes de Engenharia Avançada Hermes (Maximum Engineering Utilization)

1. **Available != Loaded (Context Minimization Inteligente)**:
   Todos os agentes e skills do registry estão disponíveis; contudo, somente o subconjunto estritamente relevante é carregado em cada etapa para evitar degradação de contexto.
2. **Specialist First**:
   Cada domínio é avaliado primeiramente pelo agente especialista dedicado antes da consolidação pelo Orchestrator.
3. **Multi-Agent Cross-Review**:
   Decisões HIGH ou CRITICAL exigem revisão cruzada (Database, Tenancy, Security, Architecture, Performance, Testing, Code Review).
4. **Adversarial Review**:
   Análise sistemática contra falhas: *"Como esta implementação pode falhar em produção?"* (race conditions, bypasses, tenant leaks, rollback risks).
5. **Alternatives Before Implementation**:
   Decisões estruturais avaliam opções concretas (Option A vs. Option B vs. Option C) com critérios de corretude, segurança, manutenibilidade e custo operacional.
6. **Skill Composition**:
   Combinação sinérgica de skills complementares em fluxos coesos.
7. **Knowledge & Failure Memory**:
   Consulta obrigatória à base `.agents/knowledge/` e histórico de incidentes para evitar repetição de falhas já remediadas.
8. **Single Codex Handoff**:
   Especialistas debatem e o Hermes Orchestrator consolida **um único plano claro e sem conflitos** para o Codex executar.

