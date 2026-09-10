# Política de Migrações de Banco de Dados — AUTUAX

## Estratégia Expand → Migrate → Contract

Para garantir zero downtime e prevenir corrupção ou perda de dados, toda alteração no esquema do banco de dados PostgreSQL 16 com Drizzle ORM deve seguir rigorosamente as três fases:

1. **Fase 1: Expand (Expandir)**
   - Adicionar novas tabelas, colunas opcionais (`NULL`) ou colunas com valores padrão seguros (`DEFAULT`).
   - Não remover colunas ou tabelas antigas.
   - Aplicações continuam funcionando com o código atual.

2. **Fase 2: Migrate (Migrar)**
   - Código da aplicação é atualizado para ler e escrever na nova estrutura.
   - Scripts de backfill assíncronos povoam dados nas novas colunas/tabelas.
   - Ambas as estruturas convivem sem impacto para os usuários.

3. **Fase 3: Contract (Contrair)**
   - Após a estabilização completa em produção e verificação dos dados, colunas ou tabelas obsoletas são removidas.
   - Constraints `NOT NULL` definitivas são adicionadas se aplicável.

---

## Classificação de Risco de Migrações

- **SAFE (Segura):**
  - Criação de novas tabelas ou índices concorrentes (`CONCURRENTLY`).
  - Adição de colunas anuláveis ou com default seguro.
  - Pode ser executada em pipeline automatizado de homologação.

- **CAUTION (Atenção):**
  - Adição de constraints de chave estrangeira em tabelas volumosas.
  - Backfill de dados que exigem bloqueios transitórios.
  - Requer auditoria prévia do `database-agent` e monitoramento de locks.

- **DESTRUCTIVE (Destrutiva - ALTO RISCO):**
  - Remoção de tabelas (`DROP TABLE`) ou colunas (`DROP COLUMN`).
  - Alteração de tipos de colunas com conversão forçada.
  - **PROIBIDA a execução automática em produção.** Exige plano formal de rollback documentado e aprovação explícita.

---

## Procedimento de Rollback

Toda migração com classificação CAUTION ou DESTRUCTIVE deve possuir um script reverso correspondente em `packages/database/src/migrations/` garantindo a restauração do estado anterior sem perda de consistência.
