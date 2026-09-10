import { getEnv } from "@autuax/config";

export interface TelemetryConfig {
  serviceName: string;
  enabled: boolean;
}

export function initTelemetry(): TelemetryConfig {
  const env = getEnv();
  return {
    serviceName: env.OTEL_SERVICE_NAME,
    enabled: env.NODE_ENV === "production",
  };
}
