import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { AnalysisPage } from "@/pages/console/analysis";

export const Route = createFileRoute("/{-$locale}/(console-layout)/app/analysis/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: "/app/analysis", locale: params.locale },
      description: "Motor determinístico de análise de vícios de autos de infração.",
      robots: { follow: false, index: false },
      title: "Análise de Vícios"
    }),
  component: AnalysisPage
});
