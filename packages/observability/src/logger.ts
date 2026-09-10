import { getEnv } from "@autuax/config";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

const SENSITIVE_KEYS = new Set([
  "password",
  "senha",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "set-cookie",
  "cpf",
  "cnh",
  "rg",
  "redis_url",
  "database_url",
  "privatekey",
  "private_key",
  "secret_key",
  "access_token",
  "refresh_token",
  "cert",
  "certificate",
]);

// Regex to redact credentials embedded inside URLs like redis://:password@host or postgresql://user:pass@host
const CONNECTION_STRING_REGEX =
  /((?:redis|rediss|postgres|postgresql):\/\/(?:[^\/@\s]+:)?)(.+?)(@(?:\[[a-f0-9:]+\]|[^/@\s:]+)(?::\d+)?(?:\/|\?|\s|$))/gi;
// Regex to redact PEM private keys
const PEM_PRIVATE_KEY_REGEX =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;

export function redactSensitiveData(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) {
    if (typeof obj === "string") {
      // Redact standard Brazilian CPF: XXX.XXX.XXX-XX or 11 digits
      const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
      // Redact standard Brazilian CNH: 11 digits
      const cnhRegex = /\b\d{11}\b/g;
      return obj
        .replace(PEM_PRIVATE_KEY_REGEX, "[REDACTED_PRIVATE_KEY]")
        .replace(CONNECTION_STRING_REGEX, "$1[REDACTED]$3")
        .replace(cpfRegex, "[REDACTED_CPF]")
        .replace(cnhRegex, "[REDACTED_CNH]");
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = redactSensitiveData(value);
    }
  }
  return redacted;
}

export interface LogEntry {
  level: LogLevel;
  service: string;
  requestId?: string | undefined;
  correlationId?: string | undefined;
  event: string;
  durationMs?: number | undefined;
  message?: string | undefined;
  error?: unknown;
  meta?: Record<string, unknown> | undefined;
  timestamp: string;
}

export class Logger {
  private service: string;

  constructor(service: string) {
    this.service = service;
  }

  private shouldLog(level: LogLevel): boolean {
    const currentConfigLevel = getEnv().LOG_LEVEL as LogLevel;
    return LOG_LEVEL_PRIORITY[level] >= (LOG_LEVEL_PRIORITY[currentConfigLevel] ?? 30);
  }

  private emit(
    level: LogLevel,
    event: string,
    data: {
      message?: string;
      requestId?: string;
      correlationId?: string;
      durationMs?: number;
      error?: unknown;
      meta?: Record<string, unknown>;
    } = {},
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      service: this.service,
      timestamp: new Date().toISOString(),
      event,
      requestId: data.requestId,
      correlationId: data.correlationId,
      durationMs: data.durationMs,
      message: data.message,
      error:
        data.error instanceof Error
          ? { message: data.error.message, name: data.error.name }
          : data.error,
      meta: (redactSensitiveData(data.meta) as Record<string, unknown>) ?? undefined,
    };

    const serialized = JSON.stringify(entry);
    if (level === "error" || level === "fatal") {
      console.error(serialized);
    } else if (level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  public info(event: string, data?: Parameters<Logger["emit"]>[2]): void {
    this.emit("info", event, data);
  }

  public warn(event: string, data?: Parameters<Logger["emit"]>[2]): void {
    this.emit("warn", event, data);
  }

  public error(event: string, data?: Parameters<Logger["emit"]>[2]): void {
    this.emit("error", event, data);
  }

  public debug(event: string, data?: Parameters<Logger["emit"]>[2]): void {
    this.emit("debug", event, data);
  }
}

export function createLogger(service: string): Logger {
  return new Logger(service);
}
