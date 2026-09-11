import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck2,
  Filter,
  Plus,
  Search,
  ShieldAlert
} from "lucide-react";
import { useState } from "react";

import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import {
  Badge,
  Panel,
  PanelHeader,
  SectionHeading,
  StatTile,
  formatCurrency,
  formatDate
} from "@/shared/ui/console-kit";

type MockFine = {
  id: string;
  aitNumber: string;
  plate: string;
  vehicleModel: string;
  infractionCode: string;
  description: string;
  authority: string;
  infractionDate: string;
  defenseDeadline: string;
  amount: number;
  points: number;
  status: "REGISTERED" | "UNDER_ANALYSIS" | "CASE_ACTIVE" | "PAID" | "CANCELLED";
  findingsCount?: number;
};

const INITIAL_FINES: MockFine[] = [
  {
    id: "fine-1",
    aitNumber: "R892341-SP",
    plate: "BRA2E19",
    vehicleModel: "Volvo FH 540",
    infractionCode: "7455-0",
    description: "Transitar em velocidade superior à máxima permitida em até 20%",
    authority: "PRF - Polícia Rodoviária Federal",
    infractionDate: "2026-08-15T14:32:00Z",
    defenseDeadline: "2026-09-25",
    amount: 130.16,
    points: 4,
    status: "UNDER_ANALYSIS",
    findingsCount: 2
  },
  {
    id: "fine-2",
    aitNumber: "D994120-MG",
    plate: "ABC1D23",
    vehicleModel: "Mercedes-Benz Actros",
    infractionCode: "5002-0",
    description: "Multa NIC - Não indicação do condutor pelo proprietário pessoa jurídica",
    authority: "DER-MG",
    infractionDate: "2026-08-10T10:15:00Z",
    defenseDeadline: "2026-09-18",
    amount: 260.32,
    points: 0,
    status: "CASE_ACTIVE",
    findingsCount: 3
  },
  {
    id: "fine-3",
    aitNumber: "B120934-RJ",
    plate: "XYZ9K88",
    vehicleModel: "Scania R 450",
    infractionCode: "7463-0",
    description: "Transitar em velocidade superior à máxima permitida em mais de 20% até 50%",
    authority: "DETRAN-RJ",
    infractionDate: "2026-08-28T16:45:00Z",
    defenseDeadline: "2026-10-05",
    amount: 195.23,
    points: 5,
    status: "REGISTERED",
    findingsCount: 0
  },
  {
    id: "fine-4",
    aitNumber: "C449102-PR",
    plate: "BRA2E19",
    vehicleModel: "Volvo FH 540",
    infractionCode: "6050-3",
    description: "Avançar o sinal vermelho do semáforo ou de parada obrigatória",
    authority: "URBS - Urbanização de Curitiba",
    infractionDate: "2026-07-22T08:20:00Z",
    defenseDeadline: "2026-08-30",
    amount: 293.47,
    points: 7,
    status: "CANCELLED",
    findingsCount: 4
  }
];

export function FinesPage() {
  const [fines] = useState<MockFine[]>(INITIAL_FINES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredFines = fines.filter((fine) => {
    const matchesSearch =
      fine.aitNumber.toLowerCase().includes(search.toLowerCase()) ||
      fine.plate.toLowerCase().includes(search.toLowerCase()) ||
      fine.infractionCode.toLowerCase().includes(search.toLowerCase()) ||
      fine.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || fine.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = fines.reduce((acc, f) => acc + f.amount, 0);
  const underAnalysisCount = fines.filter((f) => f.status === "UNDER_ANALYSIS").length;
  const activeCasesCount = fines.filter((f) => f.status === "CASE_ACTIVE").length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AUTUAX Defesa de Trânsito"
        title="Multas & Infrações"
        description="Gestão unificada de autos de infração de trânsito (AIT), conferência de requisitos formais do CTB e controle de prazos recursais."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={AlertTriangle} label="Total de Infrações" value={String(fines.length)} />
        <StatTile
          icon={ShieldAlert}
          label="Em Análise de Vícios"
          value={String(underAnalysisCount)}
        />
        <StatTile icon={FileCheck2} label="Processos Ativos" value={String(activeCasesCount)} />
        <StatTile
          icon={DollarSign}
          label="Valor Total Autuado"
          value={formatCurrency(totalAmount, true)}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Autos de Infração Cadastrados"
          description="Consulte ou filtre as infrações por placa, AIT, órgão autuador ou status processual."
          action={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar AIT
            </Button>
          }
        />

        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, AIT, código CTB ou descrição..."
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
                <option value="REGISTERED">Registrado</option>
                <option value="UNDER_ANALYSIS">Em Análise</option>
                <option value="CASE_ACTIVE">Processo Ativo</option>
                <option value="PAID">Pago</option>
                <option value="CANCELLED">Cancelado / Deferido</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">AIT / Órgão</th>
                <th className="px-4 py-3">Veículo / Placa</th>
                <th className="px-4 py-3">Enquadramento CTB</th>
                <th className="px-4 py-3">Data da Infração</th>
                <th className="px-4 py-3">Prazo Defesa</th>
                <th className="px-4 py-3">Valor / Pontos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhuma infração encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredFines.map((fine) => (
                  <tr key={fine.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-mono text-sm">{fine.aitNumber}</div>
                      <div className="text-xs text-muted-foreground">{fine.authority}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono font-semibold">
                        <Car className="h-3.5 w-3.5 text-muted-foreground" />
                        {fine.plate}
                      </div>
                      <div className="text-xs text-muted-foreground">{fine.vehicleModel}</div>
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <span className="font-mono text-xs font-semibold">{fine.infractionCode}</span>
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={fine.description}
                      >
                        {fine.description}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(fine.infractionDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        {fine.defenseDeadline}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{formatCurrency(fine.amount, true)}</div>
                      <div className="text-xs text-muted-foreground">{fine.points} pts</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {fine.status === "UNDER_ANALYSIS" && (
                        <Badge tone="warning">
                          {fine.findingsCount
                            ? `${fine.findingsCount} vícios encontrados`
                            : "Em Análise"}
                        </Badge>
                      )}
                      {fine.status === "CASE_ACTIVE" && <Badge tone="brand">Processo Criado</Badge>}
                      {fine.status === "REGISTERED" && <Badge tone="neutral">Registrado</Badge>}
                      {fine.status === "CANCELLED" && (
                        <Badge tone="success">
                          <CheckCircle2 className="mr-1 inline-block h-3 w-3" />
                          Deferido / Cancelado
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        Análise de Vícios
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
