import { getEnv } from "@autuax/config";
import { Hono } from "hono";

const openapiRoute = new Hono();

openapiRoute.get("/openapi.json", (c) => {
  const env = getEnv();
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "AUTUAX API",
      version: env.APP_VERSION,
      description:
        "Plataforma SaaS B2B multi-tenant de inteligência, gestão e automação de infrações de trânsito.",
    },
    servers: [
      {
        url: `http://localhost:${env.API_PORT}`,
        description: "Local development server",
      },
    ],
    paths: {
      "/health": {
        get: {
          summary: "API Health Check",
          description: "Retorna status básico da API",
          responses: {
            "200": { description: "API operacional" },
          },
        },
      },
      "/health/live": {
        get: {
          summary: "Liveness Probe",
          description: "Comprova que o processo do servidor HTTP está vivo",
          responses: {
            "200": { description: "Processo ativo" },
          },
        },
      },
      "/health/ready": {
        get: {
          summary: "Readiness Probe",
          description: "Verifica se as dependências críticas (PostgreSQL e Redis) estão acessíveis",
          responses: {
            "200": { description: "Todas as dependências prontas" },
            "503": { description: "Uma ou mais dependências indisponíveis" },
          },
        },
      },
      "/version": {
        get: {
          summary: "Version Info",
          description: "Retorna a versão e o ambiente da aplicação",
          responses: {
            "200": { description: "Informações de versão" },
          },
        },
      },
      "/metrics": {
        get: {
          summary: "Prometheus Metrics",
          description: "Coleta métricas do servidor em formato Prometheus",
          responses: {
            "200": { description: "Métricas geradas" },
          },
        },
      },
    },
  };

  return c.json(spec);
});

export { openapiRoute };
