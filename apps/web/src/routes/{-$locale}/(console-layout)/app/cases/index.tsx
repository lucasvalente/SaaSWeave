import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { CasesPage } from "@/pages/console/cases";

export const Route = createFileRoute("/{-$locale}/(console-layout)/app/cases/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: "/app/cases", locale: params.locale },
      description: "Acompanhamento processual de recursos e defesas de trânsito.",
      robots: { follow: false, index: false },
      title: "Processos & Defesas"
    }),
  component: CasesPage
});
