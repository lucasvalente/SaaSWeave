---
name: ci-pipeline
description: Configurar automação de integração contínua com validação estrita no GitHub Actions.
version: 1.0.0
author: AUTUAX Core Team, Hermes Agent
license: MIT
metadata:
  hermes:
    category: infrastructure
    tags: [autuax, infrastructure]
---

# CI Pipeline Skill

## Purpose
Configurar automação de integração contínua com validação estrita no GitHub Actions.

## When to use
Utilize esta skill sempre que trabalhar em tarefas, revisões ou alterações relacionadas a **CI Pipeline** no ecossistema AUTUAX.

## Inputs
- Contexto da tarefa emitido pelo Hermes Orchestrator.
- Arquivos de código, esquemas ou contratos sob escopo permitido.
- Invariantes de arquitetura e restrições de segurança do projeto.

## Procedure
1. Analisar o escopo da alteração e identificar as dependências diretas.
2. Aplicar as convenções e padrões estritos definidos para **CI Pipeline**.
3. Implementar a menor mudança suficiente que atenda ao objetivo com segurança.
4. Validar se a tipagem permanece estrita e se não há regressões em módulos adjacentes.
5. Produzir evidência verificável de compilação e testes correspondentes.

## Guardrails
- Não introduzir dependências sem justificativa e aprovação do Architecture Agent.
- Proibido enfraquecer regras de tipagem TypeScript ou bypassar validação de esquemas Zod.
- Proibido comprometer o isolamento multi-tenant ou registrar segredos/PII em logs.

## Validation
- Executar typecheck estrito (`tsc --noEmit`).
- Executar testes automatizados relevantes ao escopo.
- Confirmar ausência de erros no Biome linter.

## Outputs
- Código ou artefatos gerados/modificados com qualidade comprovada.
- Evidência de testes e compilação anexada ao relatório de entrega.
