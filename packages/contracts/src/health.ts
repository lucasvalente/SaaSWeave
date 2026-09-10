import { z } from "zod";
import { createSuccessResponseSchema } from "./http";

export const livenessDataSchema = z.object({
  status: z.literal("ok"),
  uptimeSeconds: z.number(),
  timestamp: z.string(),
});

export type LivenessData = z.infer<typeof livenessDataSchema>;
export const livenessResponseSchema = createSuccessResponseSchema(livenessDataSchema);

export const readinessDependencySchema = z.object({
  status: z.enum(["up", "down"]),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});

export const readinessDataSchema = z.object({
  status: z.enum(["ready", "unhealthy"]),
  dependencies: z
    .object({
      postgres: readinessDependencySchema,
      redis: readinessDependencySchema,
    })
    .optional(),
  timestamp: z.string(),
});

export type ReadinessData = z.infer<typeof readinessDataSchema>;
export const readinessResponseSchema = createSuccessResponseSchema(readinessDataSchema);

export const versionDataSchema = z.object({
  version: z.string(),
  environment: z.string(),
  commit: z.string().optional(),
});

export type VersionData = z.infer<typeof versionDataSchema>;
export const versionResponseSchema = createSuccessResponseSchema(versionDataSchema);
