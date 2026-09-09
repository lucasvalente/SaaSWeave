import assert from "node:assert/strict";
import { generateStructured, ModelRouter, developmentProvider } from "../packages/api/src/ai/model-router.ts";
const result = await generateStructured({ task: "planning", prompt: "Create dashboard" });
assert.equal(result.intent, "EXPLAIN");
assert.equal((await new ModelRouter([developmentProvider]).route({ task: "repair", request: "fix" })).health, "available");
console.log("Model Router tests: PASS (contract, routing, health, structured output)");
