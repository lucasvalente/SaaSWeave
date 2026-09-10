import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@autuax/ui";
import { useQuery } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";
import * as React from "react";
import { apiClient } from "../lib/api-client";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

export function IndexPage() {
  const {
    data: liveness,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["liveness"],
    queryFn: () => apiClient.getLiveness(),
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">AUTUAX</h1>
          <div className="pt-2">
            <Badge variant="success">Foundation operational</Badge>
          </div>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Plataforma SaaS B2B multi-tenant de inteligência, gestão e automação de infrações de
            trânsito.
          </p>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status da Infraestrutura Base</CardTitle>
              <span className="text-xs text-slate-500 font-mono">v0.1.0</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-xs font-mono text-slate-300 divide-y divide-slate-800">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Frontend:</span>
                <span className="text-sky-400">TanStack Start / React 19</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Router:</span>
                <span className="text-sky-400">TanStack Router</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Server State:</span>
                <span className="text-sky-400">TanStack Query</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Backend API:</span>
                <span className="text-sky-400">Hono / Bun</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Database:</span>
                <span className="text-sky-400">PostgreSQL 16 / Drizzle ORM</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Cache & Queues:</span>
                <span className="text-sky-400">Redis 7</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">API Live Status:</span>
                <span className={isLoading ? "text-amber-400" : "text-emerald-400"}>
                  {isLoading
                    ? "Consultando..."
                    : liveness?.data.status === "ok"
                      ? "Online"
                      : "Aguardando API"}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => refetch()}
              >
                Verificar Conexão com API
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
