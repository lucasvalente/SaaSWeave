import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { FinesPage } from "@/pages/console/fines";

export const Route = createFileRoute("/{-$locale}/(console-layout)/app/fines/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: "/app/fines", locale: params.locale },
      description: "Gerenciamento e auditoria de autos de infração de trânsito.",
      robots: { follow: false, index: false },
      title: "Multas & Infrações"
    }),
  component: FinesPage
});
