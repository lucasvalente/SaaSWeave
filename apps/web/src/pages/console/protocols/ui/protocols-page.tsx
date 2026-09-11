import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  Filter,
  Globe,
  Mail,
  Plus,
  Search,
  ShieldCheck
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
  formatDate
} from "@/shared/ui/console-kit";

type MockProtocol = {
  id: string;
  protocolNumber: string;
  caseNumber: string;
  authorityName: string;
  channel: "ONLINE" | "POSTAL" | "IN_PERSON" | "API";
  status: "SUBMITTED" | "CONFIRMED" | "REJECTED";
  submittedAt: string;
  receiptName: string;
  customerName: string;
};

const INITIAL_PROTOCOLS: MockProtocol[] = [
  {
    id: "prot-1",
    protocolNumber: "PRF-2026-9812401",
    caseNumber: "PROC-2026-0031",
    authorityName: "Polícia Rodoviária Federal",
    channel: "ONLINE",
    status: "CONFIRMED",
    submittedAt: "2026-08-25T11:20:00Z",
    receiptName: "recibo-protocolo-prf-9812401.pdf",
    customerName: "Expresso Rodoviário Minas"
  },
  {
    id: "prot-2",
    protocolNumber: "DETRAN-SP-2026-44910",
    caseNumber: "PROC-2026-0039",
    authorityName: "DETRAN-SP (Portal Poupatempo)",
    channel: "ONLINE",
    status: "SUBMITTED",
    submittedAt: "2026-09-08T15:45:00Z",
    receiptName: "comprovante-envio-detran.pdf",
    customerName: "Logística Brasil Central S/A"
  },
  {
    id: "prot-3",
    protocolNumber: "AR-BR994821048BR",
    caseNumber: "PROC-2026-0018",
    authorityName: "DER-MG - Sede Belo Horizonte",
    channel: "POSTAL",
    status: "CONFIRMED",
    submittedAt: "2026-08-14T09:30:00Z",
    receiptName: "aviso-recebimento-correios-ar.pdf",
    customerName: "Auto Cargas Paulista"
  }
];

export function ProtocolsPage() {
  const [protocols] = useState<MockProtocol[]>(INITIAL_PROTOCOLS);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const filteredProtocols = protocols.filter((p) => {
    const matchesSearch =
      p.protocolNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.authorityName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesChannel = channelFilter === "ALL" || p.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  const confirmedCount = protocols.filter((p) => p.status === "CONFIRMED").length;
  const submittedCount = protocols.filter((p) => p.status === "SUBMITTED").length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AUTUAX Defesa de Trânsito"
        title="Protocolos perante Órgãos"
        description="Controle de recibos de entrega, números de protocolo oficial e comprovação de tempestividade recursal."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FileCheck2} label="Total de Protocolos" value={String(protocols.length)} />
        <StatTile
          icon={CheckCircle2}
          label="Protocolos Confirmados"
          value={String(confirmedCount)}
        />
        <StatTile icon={Clock} label="Aguardando Validação" value={String(submittedCount)} />
        <StatTile icon={ShieldCheck} label="Taxa de Tempestividade" value="100%" />
      </div>

      <Panel>
        <PanelHeader
          title="Recibos e Comprovantes de Protocolo"
          description="Histórico de petições despachadas com hash criptográfico e recibo comprobatório arquivado."
          action={
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Protocolo
            </Button>
          }
        />

        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do protocolo, processo, órgão ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="ALL">Todos os Canais</option>
                <option value="ONLINE">Portal Online</option>
                <option value="POSTAL">Correios (A.R.)</option>
                <option value="IN_PERSON">Presencial</option>
                <option value="API">Integração API</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Número de Protocolo</th>
                <th className="px-4 py-3">Processo Vinculado</th>
                <th className="px-4 py-3">Órgão Julgador</th>
                <th className="px-4 py-3">Canal de Envio</th>
                <th className="px-4 py-3">Data/Hora Envio</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProtocols.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum protocolo encontrado.
                  </td>
                </tr>
              ) : (
                filteredProtocols.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-semibold">
                      {p.protocolNumber}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.caseNumber}</td>
                    <td className="px-4 py-3 text-sm">{p.authorityName}</td>
                    <td className="px-4 py-3">
                      {p.channel === "ONLINE" && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                          <Globe className="h-3.5 w-3.5" />
                          Portal Online
                        </span>
                      )}
                      {p.channel === "POSTAL" && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <Mail className="h-3.5 w-3.5" />
                          Correios (A.R.)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(p.submittedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{p.customerName}</td>
                    <td className="px-4 py-3">
                      {p.status === "CONFIRMED" && (
                        <Badge tone="success">
                          <CheckCircle2 className="mr-1 inline-block h-3 w-3" />
                          Confirmado
                        </Badge>
                      )}
                      {p.status === "SUBMITTED" && (
                        <Badge tone="info">
                          <Clock className="mr-1 inline-block h-3 w-3" />
                          Enviado / Em Análise
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary">
                        <Download className="h-3.5 w-3.5" />
                        Baixar Recibo
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
