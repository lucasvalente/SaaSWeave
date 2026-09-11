import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users
} from "lucide-react";
import { useState } from "react";

import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import { Badge, Panel, PanelHeader, SectionHeading, StatTile } from "@/shared/ui/console-kit";

type MockDriver = {
  id: string;
  name: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiration: string;
  points: number;
  customerName: string;
  status: "regular" | "suspended" | "cassated";
};

const INITIAL_DRIVERS: MockDriver[] = [
  {
    id: "drv-1",
    name: "Carlos Eduardo Silva",
    cpf: "123.456.789-00",
    cnhNumber: "04918237461",
    cnhCategory: "E",
    cnhExpiration: "2027-05-12",
    points: 14,
    customerName: "Transportadora Rápido Sol Ltda",
    status: "regular"
  },
  {
    id: "drv-2",
    name: "Antônio Marcos Oliveira",
    cpf: "234.567.890-11",
    cnhNumber: "03829104829",
    cnhCategory: "D",
    cnhExpiration: "2026-11-20",
    points: 32,
    customerName: "Logística Brasil Central S/A",
    status: "regular"
  },
  {
    id: "drv-3",
    name: "Roberto Fernandes Lima",
    cpf: "345.678.901-22",
    cnhNumber: "01928475820",
    cnhCategory: "E",
    cnhExpiration: "2028-01-15",
    points: 0,
    customerName: "Expresso Rodoviário Minas",
    status: "regular"
  },
  {
    id: "drv-4",
    name: "João Pedro Mendes",
    cpf: "456.789.012-33",
    cnhNumber: "02948192039",
    cnhCategory: "B",
    cnhExpiration: "2026-09-30",
    points: 40,
    customerName: "Auto Cargas Paulista",
    status: "suspended"
  }
];

export function DriversPage() {
  const [drivers] = useState<MockDriver[]>(INITIAL_DRIVERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.cpf.includes(search) ||
      d.cnhNumber.includes(search) ||
      d.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const suspensionRiskCount = drivers.filter(
    (d) => d.points >= 30 && d.status === "regular"
  ).length;
  const suspendedCount = drivers.filter((d) => d.status === "suspended").length;
  const regularCount = drivers.filter((d) => d.status === "regular" && d.points < 30).length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AUTUAX Defesa de Trânsito"
        title="Condutores"
        description="Gestão de motoristas, controle preventivo de pontuação na CNH (RENACH) e defesa contra processos de suspensão/cassação do direito de dirigir."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Total de Condutores" value={String(drivers.length)} />
        <StatTile
          icon={ShieldAlert}
          label="Risco de Suspensão (>= 30 pts)"
          value={String(suspensionRiskCount)}
        />
        <StatTile icon={AlertTriangle} label="CNH Suspensa" value={String(suspendedCount)} />
        <StatTile icon={ShieldCheck} label="Situação Regular" value={String(regularCount)} />
      </div>

      <Panel>
        <PanelHeader
          title="Condutores Cadastrados"
          description="Pesquise condutores por nome, CPF, prontuário CNH ou empresa vinculada."
          action={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Condutor
            </Button>
          }
        />

        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, CNH ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Todos os Status</option>
                <option value="regular">Regular</option>
                <option value="suspended">Suspenso</option>
                <option value="cassated">Cassado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Condutor / CPF</th>
                <th className="px-4 py-3">Registro CNH</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Validade CNH</th>
                <th className="px-4 py-3">Pontuação Ativa</th>
                <th className="px-4 py-3">Cliente / Frota</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum condutor encontrado.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-medium">{d.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">CPF: {d.cpf}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{d.cnhNumber}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral" className="font-mono font-bold">
                        {d.cnhCategory}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {d.cnhExpiration}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.points >= 30 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {d.points} pontos
                        </span>
                      ) : d.points > 0 ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {d.points} pontos
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0 pontos</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{d.customerName}</td>
                    <td className="px-4 py-3">
                      {d.status === "regular" && (
                        <Badge tone="success">
                          <CheckCircle2 className="mr-1 inline-block h-3 w-3" />
                          Regular
                        </Badge>
                      )}
                      {d.status === "suspended" && (
                        <Badge tone="destructive">Processo de Suspensão</Badge>
                      )}
                      {d.status === "cassated" && <Badge tone="destructive">Cassação</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        Extrato RENACH
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
