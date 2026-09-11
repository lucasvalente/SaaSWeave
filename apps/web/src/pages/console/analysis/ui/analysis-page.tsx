import {
  AlertCircle,
  BookOpen,
  Cpu,
  FileText,
  RotateCcw,
  Scale,
  ShieldAlert,
  Sparkles,
  Zap
} from "lucide-react";
import { useState } from "react";

import { Button } from "@saasweave/ui/components/button";

import { Badge, Panel, PanelHeader, SectionHeading, StatTile } from "@/shared/ui/console-kit";

type MockFinding = {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleCategory: "METROLOGIA" | "DECADENCIA" | "TIPIFICACAO" | "COMPETENCIA" | "SINALIZACAO";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "FAIL" | "WARNING" | "PASS";
  title: string;
  description: string;
  legalBasis: string;
  aitNumber: string;
  evidence: string;
};

const INITIAL_FINDINGS: MockFinding[] = [
  {
    id: "fnd-1",
    ruleId: "RULE-MET-001",
    ruleName: "Verificação Metrológica de Radar Expirada",
    ruleCategory: "METROLOGIA",
    severity: "CRITICAL",
    status: "FAIL",
    title: "Laudo do INMETRO Vencido na Data da Infração",
    description:
      "O instrumento de medição de velocidade (radar portátil) teve sua última aferição periódica em 12/06/2025. Na data da infração (15/08/2026), o prazo legal máximo de 12 meses já havia expirado em 64 dias.",
    legalBasis:
      "Art. 280, § 2º do CTB c/c Resolução CONTRAN nº 798/2020 e Portaria INMETRO nº 544/2014",
    aitNumber: "R892341-SP",
    evidence: "Certificado INMETRO nº 10928374/2025, vencido em 12/06/2026."
  },
  {
    id: "fnd-2",
    ruleId: "RULE-DEC-002",
    ruleName: "Decadência do Direito de Punir (Extrapolação de 30 Dias)",
    ruleCategory: "DECADENCIA",
    severity: "CRITICAL",
    status: "FAIL",
    title: "Notificação de Autuação Expedida Após 30 Dias",
    description:
      "A infração ocorreu em 10/08/2026, mas a Notificação de Autuação só foi postada/expedida pelo órgão em 16/09/2026 (37 dias decorridos), violando o prazo peremptório decadencial do art. 281 do CTB.",
    legalBasis: "Art. 281, parágrafo único, inciso II do CTB e Súmula 312 do STJ",
    aitNumber: "D994120-MG",
    evidence: "Comprovante postal com carimbo de remessa em 16/09/2026."
  },
  {
    id: "fnd-3",
    ruleId: "RULE-MBFT-004",
    ruleName: "Ausência de Registro Obrigatório no Campo de Observações",
    ruleCategory: "TIPIFICACAO",
    severity: "HIGH",
    status: "FAIL",
    title: "Falta de Descrição Circunstanciada Exigida pelo MBFT",
    description:
      "Para a infração tipificada, a Ficha Técnica do Manual Brasileiro de Fiscalização de Trânsito exige que o agente descreva a conduta exata no campo de observações, o qual constava inteiramente em branco.",
    legalBasis: "Manual Brasileiro de Fiscalização de Trânsito (Resolução CONTRAN nº 985/2022)",
    aitNumber: "B120934-RJ",
    evidence: "Cópia do AIT original com campo de observações sem preenchimento."
  },
  {
    id: "fnd-4",
    ruleId: "RULE-SIN-003",
    ruleName: "Sinalização Regulamentar R-19 Prévio",
    ruleCategory: "SINALIZACAO",
    severity: "MEDIUM",
    status: "WARNING",
    title: "Possível Inconsistência na Placa R-19 de Velocidade Máxima",
    description:
      "A distância entre a placa de velocidade R-19 e o medidor fixo pode estar em desconformidade com a tabela de distâncias mínimas prevista no Anexo IV da Resolução 798/2020.",
    legalBasis: "Art. 90 do CTB c/c Resolução CONTRAN nº 798/2020",
    aitNumber: "R892341-SP",
    evidence: "Croqui da via anexado indica distância de 80m quando o mínimo exigido seria de 100m."
  }
];

export function AnalysisPage() {
  const [findings] = useState<MockFinding[]>(INITIAL_FINDINGS);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isRunning, setIsRunning] = useState(false);

  const filteredFindings = findings.filter(
    (f) => categoryFilter === "ALL" || f.ruleCategory === categoryFilter
  );

  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;

  const handleRunAnalysis = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AUTUAX Inteligência Regulatória"
        title="Motor de Análise de Vícios"
        description="Auditoria automatizada e determinística de requisitos formais do CTB, resoluções do CONTRAN e conformidade metrológica do INMETRO."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Cpu} label="Regras Legais Ativas" value="48 Regras" />
        <StatTile
          icon={ShieldAlert}
          label="Vícios Críticos (Nulidade Total)"
          value={String(criticalCount)}
        />
        <StatTile icon={AlertCircle} label="Vícios de Alta Relevância" value={String(highCount)} />
        <StatTile icon={Sparkles} label="Taxa de Nulidade Identificada" value="78%" />
      </div>

      <Panel>
        <PanelHeader
          title="Apontamentos de Vícios e Teses Defensivas"
          description="Irregularidades formais, materiais e metrológicas detectadas pelo motor para sustentação de recursos."
          action={
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={handleRunAnalysis}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Processando Regras...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Executar Análise em Lote
                </>
              )}
            </Button>
          }
        />

        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Filtrar por Categoria:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Todas", value: "ALL" },
                  { label: "Metrologia INMETRO", value: "METROLOGIA" },
                  { label: "Decadência CTB 281", value: "DECADENCIA" },
                  { label: "Tipificação MBFT", value: "TIPIFICACAO" },
                  { label: "Sinalização CONTRAN", value: "SINALIZACAO" }
                ].map((item) => (
                  <Button
                    key={item.value}
                    variant={categoryFilter === item.value ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCategoryFilter(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border p-4">
          {filteredFindings.map((finding) => (
            <div key={finding.id} className="py-5 first:pt-2 last:pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {finding.ruleId}
                    </span>
                    <Badge tone={finding.severity === "CRITICAL" ? "destructive" : "warning"}>
                      {finding.severity === "CRITICAL"
                        ? "Vício Insanável / Nulidade"
                        : "Vício Formal Grave"}
                    </Badge>
                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      AIT: {finding.aitNumber}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold tracking-tight text-foreground">
                    {finding.title}
                  </h4>
                </div>

                <Button size="sm" className="gap-1.5 self-start whitespace-nowrap">
                  <FileText className="h-3.5 w-3.5" />
                  Gerar Minuta de Recurso
                </Button>
              </div>

              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {finding.description}
              </p>

              <div className="mt-4 grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Fundamentação Legal:
                  </span>
                  <p className="mt-0.5 text-muted-foreground">{finding.legalBasis}</p>
                </div>
                <div>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Evidência Factual:
                  </span>
                  <p className="mt-0.5 text-muted-foreground">{finding.evidence}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
