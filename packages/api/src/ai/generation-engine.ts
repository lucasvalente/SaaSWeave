import { z } from "zod";
import { ModelRouter, type GenerationInput, type ModelProvider } from "./model-router";

export const operationSchema = z.object({ type: z.enum(["create", "update", "delete"]), path: z.string().min(1).max(512), content: z.string().max(200_000).optional() });
export const generationResponseSchema = z.object({ intent: z.enum(["CREATE", "MODIFY", "FIX", "EXPLAIN"]), summary: z.string().min(1).max(2000), operations: z.array(operationSchema).max(100), validationNotes: z.array(z.string().max(500)).max(20) });
export type GenerationResponse = z.infer<typeof generationResponseSchema>;
export class AIGenerationEngine {
  private readonly router: ModelRouter;
  private readonly maxRepairAttempts: number;
  constructor(router: ModelRouter, maxRepairAttempts = 1) { this.router = router; this.maxRepairAttempts = maxRepairAttempts; }
  async generate(input: GenerationInput): Promise<{ response: GenerationResponse; decision: unknown; repairAttempts: number; provider: string }> {
    const routed = await this.router.route(input);
    let attempts = 0;
    while (true) {
      const result = await routed.provider.generate({ ...input, model: routed.decision.model });
      const parsed = generationResponseSchema.safeParse(result.output);
      if (parsed.success) return { response: parsed.data, decision: routed.decision, repairAttempts: attempts, provider: routed.provider.id };
      if (attempts++ >= this.maxRepairAttempts) throw new Error("AI provider returned invalid structured output");
    }
  }
}
export const deterministicProvider: ModelProvider = { id: "deterministic", models: ["deterministic-v1"], async health() { return "available"; }, async generate(input) { const started = Date.now(); return { generationId: `det-${Date.now()}`, latencyMs: Date.now() - started, output: { intent: "EXPLAIN", summary: input.request.slice(0, 200), operations: [], validationNotes: ["deterministic provider"] }, usage: {} }; } };
