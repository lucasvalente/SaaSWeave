import { CheckCircle2, Clock, FileEdit, FileText, Filter, Plus, Search, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import {
  Badge,
  Panel,
  PanelHeader,
  SectionHeading,
  StatTile,
  formatDate
} from "@/shared/ui/console-kit";

type MockCase = {
  id: string;
  caseNumber: string;
  customerName: string;
  aitNumber: string;
  infractionCode: string;
  currentInstance: "DEFESA_PREVIA" | "JARI" | "CETRAN";
  status:
    | "NEW"
    | "DOCUMENTS_READY"
    | "DEFENSE_DRAFTING"
    | "WAITING_SIGNATURE"
    | "READY_TO_PROTOCOL"
    | "PROTOCOLLED"
    | "DECISION_RECEIVED";
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string;
  openedAt: string;
};

const INITIAL_CASES: MockCase[] = [
  {
    id: "case-1",
    caseNumber: "PROC-2026-0042",
    customerName: "Transportadora Rápido Sol Ltda",
    aitNumber: "R892341-SP",
    infractionCode: "7455-0",
    currentInstance: "DEFESA_PREVIA",
    status: "DEFENSE_DRAFTING",
    priority: "urgent",
    deadline: "2026-09-25",
    openedAt: "2026-09-01T10:00:00Z"
  },
  {
    id: "case-2",
    caseNumber: "PROC-2026-0039",
    customerName: "Logística Brasil Central S/A",
    aitNumber: "D994120-MG",
    infractionCode: "5002-0",
    currentInstance: "DEFESA_PREVIA",
    status: "READY_TO_PROTOCOL",
    priority: "high",
    deadline: "2026-09-18",
    openedAt: "2026-08-20T14:30:00Z"
  },
  {
    id: "case-3",
    caseNumber: "PROC-2026-0031",
    customerName: "Expresso Rodoviário Minas",
    aitNumber: "B120934-RJ",
    infractionCode: "7463-0",
    currentInstance: "JARI",
    status: "PROTOCOLLED",
    priority: "medium",
    deadline: "2026-10-15",
    openedAt: "2026-08-10T09:15:00Z"
  },
  {
    id: "case-4",
    caseNumber: "PROC-2026-0018",
    customerName: "Auto Cargas Paulista",
    aitNumber: "C449102-PR",
    infractionCode: "6050-3",
    currentInstance: "CETRAN",
    status: "DECISION_RECEIVED",
    priority: "low",
    deadline: "2026-08-30",
    openedAt: "2026-07-15T11:00:00Z"
  }
];

export function CasesPage() {
  const [cases] = useState<MockCase[]>(INITIAL_CASES);
  const [search, setSearch] = useState("");
  const [instanceFilter, setInstanceFilter] = useState<string>("ALL");

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.aitNumber.toLowerCase().includes(search.toLowerCase());
    const matchesInstance = instanceFilter === "ALL" || c.currentInstance === instanceFilter;
    return matchesSearch && matchesInstance;
  });

  const draftingCount = cases.filter((c) => c.status === "DEFENSE_DRAFTING").length;
  const readyToProtocolCount = cases.filter((c) => c.status === "READY_TO_PROTOCOL").length;
  const protocolledCount = cases.filter((c) => c.status === "PROTOCOLLED").length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AUTUAX Defesa de Trânsito"
        title="Processos & Defesas"
        description="Acompanhamento do ciclo processual recursal: Defesa Prévia, 1ª Instância (JARI) e 2ª Instância (CETRAN/CONTRANDIFE)."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FileText} label="Total de Processos" value={String(cases.length)} />
        <StatTile icon={FileEdit} label="Elaboração de Minuta" value={String(draftingCount)} />
        <StatTile icon={Clock} label="Prontos p/ Protocolo" value={String(readyToProtocolCount)} />
        <StatTile icon={Send} label="Protocolados" value={String(protocolledCount)} />
      </div>

      <Panel>
        <PanelHeader
          title="Processos Administrativos Ativos"
          description="Acompanhe o andamento dos recursos, instâncias ativas e prazos fatais perante os órgãos de trânsito."
          action={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Processo
            </Button>
          }
        />

        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do processo, cliente ou AIT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={instanceFilter}
                onChange={(e) => setInstanceFilter(e.target.value)}
              >
                <option value="ALL">Todas as Instâncias</option>
                <option value="DEFESA_PREVIA">Defesa Prévia</option>
                <option value="JARI">JARI (1ª Instância)</option>
                <option value="CETRAN">CETRAN (2ª Instância)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nº Processo / Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Infração / AIT</th>
                <th className="px-4 py-3">Instância Atual</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3">Prazo Fatal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum processo encontrado.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-mono text-sm font-semibold">{c.caseNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(c.openedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.customerName}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div>AIT: {c.aitNumber}</div>
                      <div className="text-muted-foreground">CTB: {c.infractionCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral" className="font-mono font-semibold">
                        {c.currentInstance === "DEFESA_PREVIA" && "Defesa Prévia"}
                        {c.currentInstance === "JARI" && "JARI 1ª Inst."}
                        {c.currentInstance === "CETRAN" && "CETRAN 2ª Inst."}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {c.priority === "urgent" && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                          Urgente
                        </span>
                      )}
                      {c.priority === "high" && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Alta
                        </span>
                      )}
                      {c.priority === "medium" && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          Média
                        </span>
                      )}
                      {c.priority === "low" && (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Baixa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        {c.deadline}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.status === "DEFENSE_DRAFTING" && (
                        <Badge tone="warning">Minuta em Elaboração</Badge>
                      )}
                      {c.status === "READY_TO_PROTOCOL" && (
                        <Badge tone="info">Pronto p/ Protocolo</Badge>
                      )}
                      {c.status === "PROTOCOLLED" && <Badge tone="brand">Protocolado</Badge>}
                      {c.status === "DECISION_RECEIVED" && (
                        <Badge tone="success">
                          <CheckCircle2 className="mr-1 inline-block h-3 w-3" />
                          Decisão Proferida
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        Abrir Dossiê
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
