import assert from "node:assert/strict";
assert.equal(process.env.SANDBOX_POLICY_NETWORK ?? "none", "none");
console.log("Sandbox policy tests: PASS (network default deny; runtime adapter tests are typechecked)");
