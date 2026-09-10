import {
  type LivenessData,
  type ReadinessData,
  type VersionData,
  livenessResponseSchema,
  readinessResponseSchema,
  versionResponseSchema,
} from "./health";
import { type ErrorResponse, type SuccessResponse, errorResponseSchema } from "./http";

export interface ApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly requestId: string;
  public readonly status: number;
  public readonly details: unknown;

  constructor(status: number, errorData: ErrorResponse["error"]) {
    super(errorData.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = errorData.code;
    this.requestId = errorData.requestId;
    this.details = errorData.details;
  }
}

export class TypedApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetch: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.fetch =
      options.fetchFn ??
      (typeof fetch !== "undefined"
        ? fetch
        : ((() => {
            throw new Error("fetch not available");
          }) as unknown as typeof fetch));
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const body = await response.json();

      if (!response.ok) {
        const parsedError = errorResponseSchema.safeParse(body);
        if (parsedError.success) {
          throw new ApiClientError(response.status, parsedError.data.error);
        }
        throw new ApiClientError(response.status, {
          code: "INTERNAL_ERROR",
          message: typeof body === "string" ? body : "Unexpected API error",
          requestId: response.headers.get("x-request-id") ?? "unknown",
        });
      }

      return body as T;
    } finally {
      clearTimeout(timer);
    }
  }

  public async getLiveness(): Promise<SuccessResponse<LivenessData>> {
    const res = await this.request<SuccessResponse<LivenessData>>("/health/live");
    return livenessResponseSchema.parse(res);
  }

  public async getReadiness(): Promise<SuccessResponse<ReadinessData>> {
    const res = await this.request<SuccessResponse<ReadinessData>>("/health/ready");
    return readinessResponseSchema.parse(res);
  }

  public async getVersion(): Promise<SuccessResponse<VersionData>> {
    const res = await this.request<SuccessResponse<VersionData>>("/version");
    return versionResponseSchema.parse(res);
  }
}
