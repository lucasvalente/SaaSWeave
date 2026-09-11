import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { ProtocolsPage } from "@/pages/console/protocols";

export const Route = createFileRoute("/{-$locale}/(console-layout)/app/protocols/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: "/app/protocols", locale: params.locale },
      description: "Controle de protocolos e recibos de petições de trânsito.",
      robots: { follow: false, index: false },
      title: "Protocolos"
    }),
  component: ProtocolsPage
});
