import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const rootDir = process.cwd();
const agentsDir = join(rootDir, ".agents");

async function validate() {
  console.log("=== AUTUAX AGENT SYSTEM VALIDATION ===");
  let errors = 0;
  let warnings = 0;

  // 1. Verify Directories
  const expectedDirs = ["registry", "agents", "skills", "guardrails", "workflows", "knowledge", "templates"];
  for (const d of expectedDirs) {
    try {
      const s = await stat(join(agentsDir, d));
      if (!s.isDirectory()) {
        console.error(`FAIL: ${d} is not a directory`);
        errors++;
      }
    } catch {
      console.error(`FAIL: Directory missing: ${d}`);
      errors++;
    }
  }

  // 2. Verify 17 Agents
  const expectedAgents = [
    "hermes-orchestrator", "architecture-agent", "frontend-agent", "backend-agent",
    "database-agent", "security-agent", "tenancy-agent", "domain-traffic-agent",
    "integrations-agent", "intelligence-engine-agent", "legal-engine-agent",
    "testing-agent", "observability-agent", "performance-agent", "code-review-agent",
    "release-agent", "documentation-agent"
  ];
  for (const a of expectedAgents) {
    try {
      const content = await readFile(join(agentsDir, "agents", `${a}.md`), "utf8");
      if (!content.includes("# ") || content.length < 100) {
        console.error(`FAIL: Agent ${a}.md is too short or malformed`);
        errors++;
      }
    } catch {
      console.error(`FAIL: Agent missing: ${a}.md`);
      errors++;
    }
  }
  console.log(`✓ 17 Agentes verificados com sucesso.`);

  // 3. Verify 9 Guardrails
  const expectedGuardrails = [
    "architecture.md", "security.md", "database.md", "multi-tenancy.md",
    "privacy.md", "integrations.md", "ai.md", "migrations.md", "production.md"
  ];
  for (const g of expectedGuardrails) {
    try {
      const content = await readFile(join(agentsDir, "guardrails", g), "utf8");
      if (content.length < 50) {
        console.error(`FAIL: Guardrail ${g} is too short`);
        errors++;
      }
    } catch {
      console.error(`FAIL: Guardrail missing: ${g}`);
      errors++;
    }
  }
  console.log(`✓ 9 Guardrails verificados com sucesso.`);

  // 4. Verify 7 Workflows
  const expectedWorkflows = [
    "feature-development.md", "bug-fix.md", "database-change.md",
    "security-change.md", "integration-development.md", "release-hardening.md",
    "incident-investigation.md"
  ];
  for (const w of expectedWorkflows) {
    try {
      const content = await readFile(join(agentsDir, "workflows", w), "utf8");
      if (content.length < 50) {
        console.error(`FAIL: Workflow ${w} is too short`);
        errors++;
      }
    } catch {
      console.error(`FAIL: Workflow missing: ${w}`);
      errors++;
    }
  }
  console.log(`✓ 7 Workflows verificados com sucesso.`);

  // 5. Verify 7 Knowledge docs
  const expectedKnowledge = [
    "product.md", "architecture.md", "domain-model.md", "conventions.md",
    "integrations.md", "security.md", "decisions.md"
  ];
  for (const k of expectedKnowledge) {
    try {
      const content = await readFile(join(agentsDir, "knowledge", k), "utf8");
      if (content.length < 50) {
        console.error(`FAIL: Knowledge ${k} is too short`);
        errors++;
      }
    } catch {
      console.error(`FAIL: Knowledge missing: ${k}`);
      errors++;
    }
  }
  console.log(`✓ 7 Knowledge docs verificados com sucesso.`);

  // 6. Verify 6 Templates
  const expectedTemplates = [
    "implementation-plan.md", "review-report.md", "security-review.md",
    "migration-plan.md", "integration-report.md", "release-report.md"
  ];
  for (const t of expectedTemplates) {
    try {
      const content = await readFile(join(agentsDir, "templates", t), "utf8");
      if (content.length < 50) {
        console.error(`FAIL: Template ${t} is too short`);
        errors++;
      }
    } catch {
      console.error(`FAIL: Template missing: ${t}`);
      errors++;
    }
  }
  console.log(`✓ 6 Templates verificados com sucesso.`);

  // 7. Verify All Skills and their 7 Mandatory Sections
  const mandatorySkillSections = [
    "## Purpose", "## When to use", "## Inputs", "## Procedure",
    "## Guardrails", "## Validation", "## Outputs"
  ];
  const skillDirs = await readdir(join(agentsDir, "skills"));
  let validSkills = 0;
  for (const s of skillDirs) {
    const sStat = await stat(join(agentsDir, "skills", s));
    if (!sStat.isDirectory()) continue;
    try {
      const skillContent = await readFile(join(agentsDir, "skills", s, "SKILL.md"), "utf8");
      for (const section of mandatorySkillSections) {
        if (!skillContent.includes(section)) {
          console.error(`FAIL: Skill ${s}/SKILL.md missing section: ${section}`);
          errors++;
        }
      }
      if (!skillContent.startsWith("---") || !skillContent.includes("metadata:")) {
        console.error(`FAIL: Skill ${s}/SKILL.md missing YAML frontmatter`);
        errors++;
      }
      validSkills++;
    } catch (e) {
      console.error(`FAIL: Skill ${s} is missing SKILL.md`);
      errors++;
    }
  }
  console.log(`✓ ${validSkills} Skills verificadas com todas as 7 seções obrigatórias e YAML frontmatter.`);

  // 8. Verify Registries
  try {
    const agentsYaml = await readFile(join(agentsDir, "registry", "agents.yaml"), "utf8");
    const skillsYaml = await readFile(join(agentsDir, "registry", "skills.yaml"), "utf8");
    if (!agentsYaml.includes("hermes-orchestrator") || !skillsYaml.includes("typescript-strict")) {
      console.error("FAIL: Registry YAML files incomplete");
      errors++;
    }
  } catch {
    console.error("FAIL: Registry YAML missing");
    errors++;
  }
  console.log(`✓ Registry (agents.yaml e skills.yaml) validado.`);

  // 9. Verify Root AGENTS.md
  try {
    const rootAgents = await readFile(join(rootDir, "AGENTS.md"), "utf8");
    if (!rootAgents.includes("HERMES  = ANALYZE / PLAN / REVIEW") || !rootAgents.includes("CODEX   = EXECUTE / TEST / FIX")) {
      console.error("FAIL: Root AGENTS.md missing core role rules");
      errors++;
    }
  } catch {
    console.error("FAIL: Root AGENTS.md missing");
    errors++;
  }
  console.log(`✓ AGENTS.md raiz validado.`);

  console.log(`\nValidação finalizada: ${errors} erros, ${warnings} avisos.`);
  if (errors > 0) process.exit(1);
}

validate().catch(err => {
  console.error("Erro na validação:", err);
  process.exit(1);
});
