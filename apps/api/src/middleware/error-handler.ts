import type { ErrorCode, ErrorResponse } from "@autuax/contracts";
import { createLogger } from "@autuax/observability";
import type { ErrorHandler } from "hono";
import type { AppEnv } from "../types";

const logger = createLogger("api:error-handler");

export class AppHttpError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = (c.get("requestId") as string) || "unknown";

  if (err instanceof AppHttpError) {
    const errorBody: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        requestId,
        details: err.details,
      },
    };
    return c.json(errorBody, err.status as 400);
  }

  logger.error("unhandled_error", {
    message: err.message,
    requestId,
    error: err,
  });

  const errorBody: ErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId,
    },
  };

  return c.json(errorBody, 500);
};
