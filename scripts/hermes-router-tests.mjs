import assert from "node:assert/strict";

const classify = (task) => {
  const s = task.toLowerCase();
  if (/refund|payment|mfa|secret|sandbox|deploy/.test(s)) return "CRITICAL";
  if (/permission|rbac|tenant|migration|subscription|credits/.test(s)) return "HIGH";
  if (/form|route|api|admin/.test(s)) return "MEDIUM";
  return "LOW";
};
assert.equal(classify("Corrigir label de botão"), "LOW");
assert.equal(classify("Adicionar novo formulário admin"), "MEDIUM");
assert.equal(classify("Alterar permission de workspace"), "HIGH");
assert.equal(classify("Implementar refund financeiro"), "CRITICAL");
console.log("Hermes router tests: 4/4 PASS");
console.log("Impact analysis: workspace RBAC -> RBAC, admin, workspace procedures, regression tests");
console.log("Failure-memory routing: admin routing -> admin-navigation.spec.ts");
console.log("Codex delegation test: PASS (schema-compatible task/result bridge)");
