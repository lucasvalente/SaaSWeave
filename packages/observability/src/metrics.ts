import client, { Registry, Counter, Histogram, Gauge } from "prom-client";

export class MetricsRegistry {
  public readonly registry: Registry;
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpErrorsTotal: Counter<string>;
  public readonly databaseHealth: Gauge<string>;
  public readonly redisHealth: Gauge<string>;
  public readonly workerHealth: Gauge<string>;

  constructor() {
    this.registry = new Registry();

    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests processed",
      labelNames: ["method", "route", "status"],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpErrorsTotal = new Counter({
      name: "http_errors_total",
      help: "Total number of HTTP errors returned",
      labelNames: ["method", "route", "error_code"],
      registers: [this.registry],
    });

    this.databaseHealth = new Gauge({
      name: "database_health",
      help: "Database connection status (1 = up, 0 = down)",
      registers: [this.registry],
    });

    this.redisHealth = new Gauge({
      name: "redis_health",
      help: "Redis connection status (1 = up, 0 = down)",
      registers: [this.registry],
    });

    this.workerHealth = new Gauge({
      name: "worker_health",
      help: "Worker process status (1 = operational, 0 = down)",
      registers: [this.registry],
    });
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  public getContentType(): string {
    return this.registry.contentType;
  }
}

let _globalMetrics: MetricsRegistry | null = null;

export function getMetricsRegistry(): MetricsRegistry {
  if (!_globalMetrics) {
    _globalMetrics = new MetricsRegistry();
  }
  return _globalMetrics;
}
