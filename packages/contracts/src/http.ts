import { z } from "zod";

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "DEPENDENCY_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorPayloadSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  requestId: z.string(),
  details: z.unknown().optional(),
});

export type ErrorPayload = z.infer<typeof errorPayloadSchema>;

export const errorResponseSchema = z.object({
  error: errorPayloadSchema,
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export function createSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z.record(z.unknown()).default({}),
  });
}

export type SuccessResponse<T> = {
  data: T;
  meta: Record<string, unknown>;
};
