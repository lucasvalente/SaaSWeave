import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { VehiclesPage } from "@/pages/console/vehicles";

export const Route = createFileRoute("/{-$locale}/(console-layout)/app/vehicles/")({
  head: ({ params }) =>
    generateAppSeo({
      alternates: { canonicalPath: "/app/vehicles", locale: params.locale },
      description: "Gestão e controle de veículos e frota.",
      robots: { follow: false, index: false },
      title: "Veículos & Frota"
    }),
  component: VehiclesPage
});
