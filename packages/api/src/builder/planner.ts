export type GenerationStep = { id: string; order: number; title: string; description: string; status: "pending"; operationType: "write_file"; dependencies: string[] };
export type GenerationPlan = { intent: string; summary: string; steps: GenerationStep[]; expectedChanges: string[]; validationRequirements: string[] };
export interface GenerationModelProvider { planProjectChange(context: unknown, userRequest: string): Promise<GenerationPlan>; }
/** Deterministic development provider. It is intentionally not an LLM and must not be used for production intelligence. */
export const developmentPlanner: GenerationModelProvider = { async planProjectChange(_context, request) {
  const needsBackend = /auth|account|database|todo|storage|realtime/i.test(request);
  const needsRealtime = /realtime/i.test(request);
  const steps: GenerationStep[] = [{ id: "app-shell", order: 1, title: "Create app shell", description: "Create the initial application shell", status: "pending", operationType: "write_file", dependencies: [] }];
  if (needsBackend) steps.push({ id: "supabase-client", order: 2, title: "Use platform Supabase client", description: "Reuse src/lib/supabase.ts with the public VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY contract. Do not add another backend or credentials.", status: "pending", operationType: "write_file", dependencies: ["app-shell"] });
  if (needsRealtime) steps.push({ id: "supabase-realtime", order: 3, title: "Add Supabase Realtime", description: "Reuse the canonical Supabase client for the realtime subscription.", status: "pending", operationType: "write_file", dependencies: ["supabase-client"] });
  return { intent: "scaffold", summary: `Plan for: ${request.slice(0, 240)}`, steps, expectedChanges: needsBackend ? ["Create initial app shell", "Use canonical Supabase Auth and database client"] : ["Create initial app shell"], validationRequirements: ["TypeScript check"] };
} };

import { ENV_SERVER } from "@saasweave/env/server/env";

/** Provider boundary: credentials never leave this module and failures fail closed to deterministic planning. */
export const aiPlanner: GenerationModelProvider = {
  async planProjectChange(_context, request) {
    if (!ENV_SERVER.AI_MODEL_API_KEY || ENV_SERVER.AI_MODEL_PROVIDER !== "openai-compatible") {
      return developmentPlanner.planProjectChange(_context, request);
    }
    const response = await fetch(ENV_SERVER.AI_MODEL_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ENV_SERVER.AI_MODEL_API_KEY}` },
      body: JSON.stringify({ model: ENV_SERVER.AI_MODEL_NAME, temperature: 0, messages: [{ role: "system", content: "Return JSON with intent, summary, steps, expectedChanges, validationRequirements. For auth, database, storage, or realtime use the canonical src/lib/supabase.ts and VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY only. Never introduce Firebase, another backend, credentials, service-role keys, or secrets." }, { role: "user", content: request }] }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) return developmentPlanner.planProjectChange(_context, request);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    try {
      const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "") as GenerationPlan;
      if (!parsed.intent || !parsed.summary || !Array.isArray(parsed.steps)) throw new Error("invalid model plan");
      return parsed;
    } catch { return developmentPlanner.planProjectChange(_context, request); }
  }
};

export function getGenerationPlanner(): GenerationModelProvider {
  return ENV_SERVER.AI_MODEL_PROVIDER === "openai-compatible" ? aiPlanner : developmentPlanner;
}
