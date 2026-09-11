import {
  AlertTriangle,
  Car,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  Fuel,
  Plus,
  Search,
  ShieldCheck
} from "lucide-react";
import { useState } from "react";

import { Button } from "@saasweave/ui/components/button";
import { Input } from "@saasweave/ui/components/input";

import { Badge, Panel, PanelHeader, SectionHeading, StatTile } from "@/shared/ui/console-kit";

type MockVehicle = {
  id: string;
  plate: string;
  renavam: string;
  chassi: string;
  brand: string;
  model: string;
  modelYear: number;
  manufactureYear: number;
  color: string;
  fuelType: string;
  customerName: string;
  status: "active" | "inactive" | "sold";
  activeFinesCount: number;
};

const INITIAL_VEHICLES: MockVehicle[] = [
  {
    id: "veh-1",
    plate: "BRA2E19",
    renavam: "01182394857",
    chassi: "9BWZZZ377VT004210",
    brand: "Volvo",
    model: "FH 540 6x4",
    modelYear: 2024,
    manufactureYear: 2023,
    color: "Branco",
    fuelType: "diesel",
    customerName: "Transportadora Rápido Sol Ltda",
    status: "active",
    activeFinesCount: 2
  },
  {
    id: "veh-2",
    plate: "ABC1D23",
    renavam: "00948271635",
    chassi: "9BM958040EB019234",
    brand: "Mercedes-Benz",
    model: "Actros 2651",
    modelYear: 2023,
    manufactureYear: 2022,
    color: "Prata",
    fuelType: "diesel",
    customerName: "Logística Brasil Central S/A",
    status: "active",
    activeFinesCount: 1
  },
  {
    id: "veh-3",
    plate: "XYZ9K88",
    renavam: "01239847561",
    chassi: "9BS4X2000GB102948",
    brand: "Scania",
    model: "R 450",
    modelYear: 2022,
    manufactureYear: 2022,
    color: "Azul",
    fuelType: "diesel",
    customerName: "Expresso Rodoviário Minas",
    status: "active",
    activeFinesCount: 1
  },
  {
    id: "veh-4",
    plate: "JKL3M45",
    renavam: "00847291039",
    chassi: "9BG111000KA002934",
    brand: "Volkswagen",
    model: "Delivery 11.180",
    modelYear: 2021,
    manufactureYear: 2021,
    color: "Vermelho",
    fuelType: "diesel",
    customerName: "Transportadora Rápido Sol Ltda",
    status: "active",
    activeFinesCount: 0
  }
];

export function VehiclesPage() {
  const [vehicles] = useState<MockVehicle[]>(INITIAL_VEHICLES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.renavam.includes(search) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const withFinesCount = vehicles.filter((v) => v.activeFinesCount > 0).length;
  const regularCount = vehicles.filter((v) => v.activeFinesCount === 0).length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AUTUAX Defesa de Trânsito"
        title="Veículos & Frota"
        description="Cadastro de frotas, dados do RENAVAM/chassi, controle de multas por veículo e acompanhamento de restrições."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Car} label="Total de Veículos" value={String(vehicles.length)} />
        <StatTile
          icon={AlertTriangle}
          label="Com Infrações Pendentes"
          value={String(withFinesCount)}
        />
        <StatTile icon={ShieldCheck} label="Frota Regular" value={String(regularCount)} />
        <StatTile icon={FileSpreadsheet} label="Integração SENATRAN" value="Conectado" />
      </div>

      <Panel>
        <PanelHeader
          title="Veículos Cadastrados"
          description="Consulte a frota por placa, renavam, chassi ou empresa proprietária."
          action={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Veículo
            </Button>
          }
        />

        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, RENAVAM, modelo ou cliente..."
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
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="sold">Vendido</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Placa / Renavam</th>
                <th className="px-4 py-3">Marca / Modelo</th>
                <th className="px-4 py-3">Chassi</th>
                <th className="px-4 py-3">Ano / Combustível</th>
                <th className="px-4 py-3">Cliente / Proprietário</th>
                <th className="px-4 py-3">Infrações Pendentes</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum veículo encontrado.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-mono text-sm font-semibold">{v.plate}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        RENAVAM: {v.renavam}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {v.brand} {v.model}
                      </div>
                      <div className="text-xs text-muted-foreground">{v.color}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {v.chassi}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>
                        {v.manufactureYear}/{v.modelYear}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground uppercase">
                        <Fuel className="h-3 w-3" />
                        {v.fuelType}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{v.customerName}</td>
                    <td className="px-4 py-3">
                      {v.activeFinesCount > 0 ? (
                        <Badge tone="warning">{v.activeFinesCount} pendente(s)</Badge>
                      ) : (
                        <Badge tone="success">
                          <CheckCircle2 className="mr-1 inline-block h-3 w-3" />
                          Nenhuma
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="success">Ativo</Badge>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        Ver Histórico
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
