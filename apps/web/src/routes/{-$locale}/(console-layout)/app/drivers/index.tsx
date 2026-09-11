import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { DriversPage } from "@/pages/console/drivers";

export const Route = createFileRoute("/{-$locale}/(console-layout)/app/drivers/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: "/app/drivers", locale: params.locale },
      description: "Controle de prontuário de condutores e pontuação CNH.",
      robots: { follow: false, index: false },
      title: "Condutores"
    }),
  component: DriversPage
});
