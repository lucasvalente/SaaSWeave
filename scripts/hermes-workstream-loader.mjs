import { readFile } from "node:fs/promises";

const root = new URL("../.hermes/state/", import.meta.url);
async function load(name) { return JSON.parse(await readFile(new URL(name, root), "utf8")); }

/** Loads a persisted workstream without fixture fallback. */
export async function loadPersistedWorkstream(id) {
  if (!id || id === "hermes-v3-runtime-fixture") throw new Error("WORKSTREAM_REQUIRED");
  const [project, workstreams, evidence, metrics] = await Promise.all([load("project-state.json"), load("workstreams.json"), load("evidence-ledger.json"), load("execution-metrics.json")]);
  if (!(id in workstreams.workstreams) || !project.in_progress.includes(id)) throw new Error("WORKSTREAM_NOT_FOUND");
  const entry = evidence.entries.find((item) => item.workstream === id);
  if (!entry) throw new Error("ACCEPTANCE_CONTRACT_NOT_FOUND");
  const pending = Array.isArray(entry.pending) ? entry.pending : [];
  const completed = Array.isArray(entry.evidence) ? entry.evidence.filter((item) => item.result === "PASS").map((item) => item.name ?? item.criterion).filter(Boolean) : [];
  return { id, status: workstreams.workstreams[id], acceptance_loaded: true, criteria: [...completed, ...pending], completed_criteria: completed, pending_criteria: pending, checkpoints: [], evidence: entry.evidence ?? [], metrics: metrics.workstreams?.[id] ?? {}, blockers: [], metadata: { source: "persisted-state", fixture_used: false } };
}
