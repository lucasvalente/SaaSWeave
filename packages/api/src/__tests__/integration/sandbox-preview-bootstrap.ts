/** Test-only bootstrap. Identity/workspace setup uses the existing harness;
 * project creation and snapshot commit go through the real console routers. */
import { createCallerFor, seedOrgWithOwner, type SeedOrgWithOwnerResult } from "./harness";

export type SandboxPreviewBootstrap = { seed: SeedOrgWithOwnerResult; projectId: string; snapshotId: string };

export async function bootstrapSandboxPreviewE2E(): Promise<SandboxPreviewBootstrap> {
  const seed = await seedOrgWithOwner({ organizationName: "Sandbox Preview E2E" });
  const caller = await createCallerFor({ seed, userRole: "admin" });
  await caller.admin.features.list({});
  await caller.admin.features.setForOrganization({
    enabled: true,
    key: "builder_access",
    organizationId: seed.organizationId
  });
  const project = await caller.console.projects.create({ name: "Sandbox Preview E2E", description: "Deterministic test project" });
  const snapshot = await caller.console.builder.initialize({ projectId: project.id });
  return { seed, projectId: project.id, snapshotId: snapshot.id };
}
