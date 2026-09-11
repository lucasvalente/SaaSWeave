# AUTUAX Trânsito V1 - Relatório de Status e Transição para Codex

**Data**: 11 de Setembro de 2026  
**Status do Módulo**: Em desenvolvimento ativo (Banco de Dados + Frontend Console concluídos; Camada API/oRPC pendente)  
**Status Git**: Arquivos gerados no working tree (não commitados)

---

## 1. Resumo Executivo

O módulo **AUTUAX Trânsito** adiciona à plataforma SaaSWeave a infraestrutura completa para gestão, auditoria e defesa de infrações de trânsito (CTB / Resoluções CONTRAN / Portarias INMETRO).

Foi implementada a camada de persistência com 20 entidades relacionais estritamente multi-tenant (`tenant_id`), geração de migrações Drizzle, testes unitários automatizados e a interface completa do console do usuário com 6 seções navegáveis e tipagem TypeScript validada.

---

## 2. Entregáveis Concluídos

### 2.1. Banco de Dados & Schemas (`packages/db`)

Localização: `packages/db/src/schema/traffic/`

- **Multi-tenancy obrigatório**: Todas as tabelas de escopo do cliente possuem coluna `tenant_id` NOT NULL.
- **Tabelas entregues (20 entidades)**:
  1. `customers` (`customers.schema.ts`): Clientes proprietários ou condutores.
  2. `customer_addresses` (`customer-addresses.schema.ts`): Endereços para correspondência/AR.
  3. `drivers` (`drivers.schema.ts`): Condutores, CNH, categoria, pontuação acumulada RENACH.
  4. `vehicles` (`vehicles.schema.ts`): Veículos da frota, placa, RENAVAM, chassi, características.
  5. `traffic_authorities` (`traffic-authorities.schema.ts`): Órgãos autuadores (PRF, DETRAN, DER, Prefeituras/DSV).
  6. `equipment_verifications` (`equipment.schema.ts`): Radares/etilômetros, número de série e aferição INMETRO.
  7. `traffic_fines` (`traffic-fines.schema.ts`): Autos de infração (AIT), código CTB, valor, prazos, enquadramento.
  8. `units` e `membership_units` (`units.schema.ts`, `membership-units.schema.ts`): Filiais/unidades operacionais da frota.
  9. `cases` (`cases.schema.ts`): Processos administrativos de defesa/recurso abertos.
  10. `case_instances` (`case-instances.schema.ts`): Instâncias recursais (`DEFESA_PREVIA`, `JARI`, `CETRAN`).
  11. `case_timeline_events` (`case-timeline-events.schema.ts`): Linha do tempo auditável de movimentações.
  12. `analysis_runs` (`analysis-runs.schema.ts`): Execuções do motor de auditoria de vícios.
  13. `analysis_findings` (`analysis-findings.schema.ts`): Vícios formais e materiais detectados (ex: decadência de 30 dias do Art. 281 CTB, radar vencido).
  14. `deadlines` (`deadlines.schema.ts`): Prazos de defesa prévia, indicação de condutor e recursos.
  15. `documents` (`documents.schema.ts`): Peças jurídicas geradas e anexos comprobatórios.
  16. `protocols` (`protocols.schema.ts`): Comprovantes e recibos de protocolo (online, correios/AR ou presencial).
  17. `outbox_events` (`outbox-events.schema.ts`): Eventos transacionais de mensageria assíncrona.
  18. `idempotency_keys` (`idempotency-keys.schema.ts`): Proteção contra duplicidade de ações.
  19. `external_queries` (`external-queries.schema.ts`): Histórico de consultas Detran/Senatran.
  20. Relações Drizzle: `relations.ts` com mapeamentos 1:N e N:1 normalizados.
- **Exportação mestre**: Centralizada em `packages/db/src/schema/index.ts`.
- **Migração Drizzle**: Gerada em `packages/db/migrations/20260911023406_real_hitman/`.
- **Testes automatizados**: `packages/db/src/__tests__/traffic-schema.test.ts` validando todas as 20 tabelas, chaves primárias e `tenant_id`.

### 2.2. Frontend Console (`apps/web`)

Localização: `apps/web/src/pages/console/` e `apps/web/src/routes/{-$locale}/(console-layout)/app/`

- **Menu de Navegação**:
  - Adicionado o grupo **"AUTUAX Trânsito"** no topo da barra de navegação em `apps/web/src/features/console-nav/config/console-nav.config.ts`.
- **6 Telas e Módulos do Console**:
  1. `/app/fines` (`pages/console/fines`): Listagem, filtros por status/órgão/código CTB, KPIs de valores autuados e gestão de AITs.
  2. `/app/cases` (`pages/console/cases`): Pipeline recursal (Defesa Prévia, 1ª Instância JARI, 2ª Instância CETRAN), prioridades e prazos.
  3. `/app/vehicles` (`pages/console/vehicles`): Gestão de veículos e frotas, histórico de pendências por placa/RENAVAM.
  4. `/app/drivers` (`pages/console/drivers`): Condutores cadastrados, acompanhamento de risco de suspensão/cassação e pontuação CNH.
  5. `/app/analysis` (`pages/console/analysis`): Motor de inteligência regulatória para detecção de vícios no AIT (Metrologia INMETRO, Decadência CTB art. 281, Sinalização CONTRAN, Tipificação MBFT).
  6. `/app/protocols` (`pages/console/protocols`): Acompanhamento de protocolos realizados, canais de envio e download de recibos.
- **Compatibilidade do Design System**:
  - Uso dos componentes oficiais do SaaSWeave (`Panel`, `PanelHeader`, `SectionHeading`, `StatTile`, `Badge` com `tone="success"|"warning"|"destructive"|"info"|"brand"|"neutral"` e `formatCurrency`).
  - Rotas integradas ao TanStack Start com metadados de SEO gerados via `generateAppSeo`.

---

## 3. Estado Atual no Git

> [!WARNING]
> Os arquivos **ainda NÃO foram commitados** no repositório Git. Eles estão presentes na árvore de trabalho local (Working Directory).

### Arquivos Modificados / Não Rastreados (`git status`):

- `M apps/web/src/features/console-nav/config/console-nav.config.ts`
- `M apps/web/src/routeTree.gen.ts`
- `M packages/db/src/schema/index.ts`
- `?? apps/web/src/pages/console/analysis/`
- `?? apps/web/src/pages/console/cases/`
- `?? apps/web/src/pages/console/drivers/`
- `?? apps/web/src/pages/console/fines/`
- `?? apps/web/src/pages/console/protocols/`
- `?? apps/web/src/pages/console/vehicles/`
- `?? apps/web/src/routes/{-$locale}/(console-layout)/app/analysis/`
- `?? apps/web/src/routes/{-$locale}/(console-layout)/app/cases/`
- `?? apps/web/src/routes/{-$locale}/(console-layout)/app/drivers/`
- `?? apps/web/src/routes/{-$locale}/(console-layout)/app/fines/`
- `?? apps/web/src/routes/{-$locale}/(console-layout)/app/protocols/`
- `?? apps/web/src/routes/{-$locale}/(console-layout)/app/vehicles/`
- `?? packages/db/migrations/20260911023406_real_hitman/`
- `?? packages/db/src/__tests__/traffic-schema.test.ts`
- `?? packages/db/src/schema/traffic/`

---

## 4. Próximos Passos para o Codex / Desenvolvedor

1. **Commit no Git**:

   ```bash
   git add packages/db/ apps/web/
   git commit -m "feat(traffic): add AUTUAX traffic domain schema, migrations and console UI"
   ```

2. **Criar Routers oRPC (`packages/api`)**:
   - Criar `packages/api/src/routers/console/traffic/` com routers para:
     - `fines.router.ts`: `list`, `getById`, `create`, `updateStatus`
     - `cases.router.ts`: `list`, `createFromFine`, `transitionInstance`
     - `vehicles.router.ts`: `list`, `create`, `syncHistory`
     - `drivers.router.ts`: `list`, `create`, `checkPoints`
     - `analysis.router.ts`: `runRules`, `listFindings`
     - `protocols.router.ts`: `create`, `downloadReceipt`
   - Registrar no router principal do console (`packages/api/src/routers/console/index.ts`).

3. **Conectar as Telas (`apps/web`) ao Backend**:
   - Substituir os `INITIAL_FINES`, `INITIAL_CASES`, etc. por chamadas `orpc.console.traffic.*.useQuery()`.
