import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import * as React from "react";
import { getQueryClient } from "../lib/query-client";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-slate-400">Página não encontrada</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 text-red-400">Erro na Aplicação</h1>
        <p className="text-slate-400">
          {error instanceof Error ? error.message : "Erro desconhecido"}
        </p>
      </div>
    </div>
  ),
});

function RootComponent() {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
