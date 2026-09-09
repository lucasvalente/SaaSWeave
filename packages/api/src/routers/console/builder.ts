import { createHash, randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, recordAudit } from "@saasweave/db";
import { builderMessage, builderOperation, builderPlan, builderSession, builderSnapshot, project, projectSupabaseIntegration } from "@saasweave/db/schema";
import { requireFeature } from "#@/lib/procedures/factory";
import { isFeatureEnabledForOrg } from "#@/lib/features";
import { getGenerationPlanner } from "#@/builder/planner";

const MAX_PROMPT = 12_000;
const MAX_OPERATIONS = 100;
const MAX_FILE_SIZE = 512_000;
const projectInput = z.object({ projectId: z.string().min(1) });
function templateFiles(supabase: { publicUrl: string; publicAnonKey: string } | undefined) {
  const supabaseConfig = supabase
    ? `import { createClient } from "@supabase/supabase-js";\n\n/** Runtime-injected public config only. Never add a service-role key here. */\nconst url = process.env.VITE_SUPABASE_URL;\nconst anonKey = process.env.VITE_SUPABASE_ANON_KEY;\nif (!url || !anonKey) throw new Error("SUPABASE_PUBLIC_CONFIG_MISSING");\nexport const supabase = createClient(url, anonKey);\nexport const isSupabaseConfigured = true;\n`
    : "export const supabase = null;\nexport const isSupabaseConfigured = false;\nexport function requireSupabase() { throw new Error(\"SUPABASE_NOT_CONFIGURED\"); }\n";
  return [
  { path: "src/routes/index.tsx", content: 'export default function Home() { return <main>Generated app</main>; }' },
  { path: "index.html", content: '<!doctype html><html><body><main>Generated app</main></body></html>' },
  { path: "server.mjs", content: "import { createServer } from 'node:http';\nimport { readFile } from 'node:fs/promises';\n\nconst port = Number(process.env.PORT || 4173);\nconst publicConfig = process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY ? { url: process.env.VITE_SUPABASE_URL, anonKey: process.env.VITE_SUPABASE_ANON_KEY } : null;\nconst serializedConfig = JSON.stringify(publicConfig).replace(/</g, '\\\\u003c');\nconst probe = publicConfig ? `<script>window.__SAASWEAVE_SUPABASE_CONFIG__=${serializedConfig};</script><script>const config=window.__SAASWEAVE_SUPABASE_CONFIG__;const status=document.createElement('p');status.id='supabase-runtime-status';status.dataset.configured='true';status.textContent='Checking Supabase connection…';document.addEventListener('DOMContentLoaded',()=>document.body.append(status));fetch(new URL('/auth/v1/health',config.url),{headers:{apikey:config.anonKey,Authorization:'Bearer '+config.anonKey}}).then(response=>{status.dataset.status=response.ok?'connected':'request-failed';status.textContent=response.ok?'Supabase connected':'Supabase request failed';}).catch(()=>{status.dataset.status='request-failed';status.textContent='Supabase request failed';});</script>` : `<p id='supabase-runtime-status' data-configured='false' data-status='not-configured'>Supabase not configured</p>`;\ncreateServer(async (_req, res) => { const html = await readFile('index.html', 'utf8'); res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); res.end(html.replace('</body>', `${probe}</body>`)); }).listen(port, '0.0.0.0');" },
  { path: "src/lib/supabase.ts", content: supabaseConfig },
  { path: "messages/en.json", content: "{}" },
  { path: "messages/pt-BR.json", content: "{}" },
  { path: "messages/es.json", content: "{}" },
  // The runtime's offline/frozen install uses the intentionally minimal
  // Golden Template lockfile.  The canonical Supabase client remains in
  // src/lib/supabase.ts and the generated server performs the real public
  // REST probe; adding an unresolved registry dependency here would make the
  // lockfile invalid and prevent every preview from reaching build/dev.
  { path: "package.json", content: JSON.stringify({ private: true, type: "module", dependencies: {}, scripts: { build: "node -e \"console.log('build ok')\"", dev: "node server.mjs" } }, null, 2) },
  { path: "pnpm-lock.yaml", content: "lockfileVersion: '9.0'\n" }
] as const;
}
function hash(content: string) { return createHash("sha256").update(content).digest("hex"); }
function safePath(value: string) {
  const path = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!path || path.length > 240 || path.includes("\0") || path.split("/").some((part) => part === ".." || part === ".")) throw new ORPCError("BAD_REQUEST");
  if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.endsWith("/")) throw new ORPCError("BAD_REQUEST");
  return path;
}
async function assertProject(context: { organization: { id: string; role: string } }, projectId: string) {
  const [entry] = await db.select({ id: project.id, status: project.status }).from(project).where(and(eq(project.id, projectId), eq(project.workspaceId, context.organization.id))).limit(1);
  if (!entry) throw new ORPCError("NOT_FOUND");
  if (entry.status === "archived") throw new ORPCError("FORBIDDEN");
  return entry;
}
const builderProcedure = requireFeature("builder_access");
export const builderRouter = {
  state: builderProcedure.input(projectInput).handler(async ({ context, input }) => {
    await assertProject(context, input.projectId);
    const [session] = await db.select().from(builderSession).where(and(eq(builderSession.projectId, input.projectId), eq(builderSession.workspaceId, context.organization.id))).orderBy(desc(builderSession.updatedAt)).limit(1);
    if (!session) {
      const snapshots = await db.select().from(builderSnapshot).where(eq(builderSnapshot.projectId, input.projectId)).orderBy(desc(builderSnapshot.createdAt)).limit(20);
      return { session: null, messages: [], plan: null, snapshots };
    }
    const [messages, plan, snapshots] = await Promise.all([
      db.select().from(builderMessage).where(eq(builderMessage.sessionId, session.id)).orderBy(desc(builderMessage.createdAt)),
      db.select().from(builderPlan).where(eq(builderPlan.sessionId, session.id)).limit(1),
      db.select().from(builderSnapshot).where(eq(builderSnapshot.projectId, input.projectId)).orderBy(desc(builderSnapshot.createdAt)).limit(20)
    ]);
    return { session, messages, plan: plan[0] ?? null, snapshots };
  }),
  sendPrompt: builderProcedure.input(projectInput.extend({ content: z.string().trim().min(1).max(MAX_PROMPT) })).handler(async ({ context, input }) => {
    await assertProject(context, input.projectId);
    const [session] = await db.insert(builderSession).values({ id: randomUUID(), projectId: input.projectId, workspaceId: context.organization.id, createdBy: context.session.user.id, status: "planning" }).onConflictDoNothing().returning();
    if (!session) throw new ORPCError("CONFLICT");
    await db.insert(builderMessage).values({ id: randomUUID(), sessionId: session.id, role: "user", content: input.content, status: "completed", metadata: {} });
    const aiEnabled = await isFeatureEnabledForOrg(context.organization.id, "builder_ai");
    const generated = aiEnabled ? await getGenerationPlanner().planProjectChange({ projectId: input.projectId, organizationId: context.organization.id }, input.content) : await getGenerationPlanner().planProjectChange({}, input.content);
    const steps = [{ id: "understand", order: 1, title: "Understand request", status: "completed" }, ...generated.steps];
    const [plan] = await db.insert(builderPlan).values({ id: randomUUID(), sessionId: session.id, intent: generated.intent, summary: generated.summary, steps }).returning();
    await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "builder.session_created", organizationId: context.organization.id, targetLabel: input.projectId, targetType: "project" });
    return { session, plan };
  }),
  initialize: builderProcedure.input(projectInput).handler(async ({ context, input }) => {
    await assertProject(context, input.projectId);
    const [snapshot] = await db.select().from(builderSnapshot).where(eq(builderSnapshot.projectId, input.projectId)).orderBy(desc(builderSnapshot.createdAt)).limit(1);
    if (snapshot) return snapshot;
    const [supabase] = await db.select({ publicUrl: projectSupabaseIntegration.publicUrl, publicAnonKey: projectSupabaseIntegration.publicAnonKey }).from(projectSupabaseIntegration).where(and(eq(projectSupabaseIntegration.projectId, input.projectId), eq(projectSupabaseIntegration.workspaceId, context.organization.id))).limit(1);
    const manifest = Object.fromEntries(templateFiles(supabase).map((file) => [file.path, { content: file.content, hash: hash(file.content), size: file.content.length }]));
    const [created] = await db.insert(builderSnapshot).values({ id: randomUUID(), projectId: input.projectId, createdBy: context.session.user.id, source: "golden-template", summary: "Initial Golden Template", manifest }).returning();
    await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "builder.project_initialized", organizationId: context.organization.id, targetLabel: input.projectId, targetType: "project" });
    return created;
  }),
  files: builderProcedure.input(projectInput).handler(async ({ context, input }) => {
    await assertProject(context, input.projectId);
    const [snapshot] = await db.select().from(builderSnapshot).where(eq(builderSnapshot.projectId, input.projectId)).orderBy(desc(builderSnapshot.createdAt)).limit(1);
    return snapshot ? Object.entries(snapshot.manifest as Record<string, unknown>).map(([path, value]) => ({ path, ...(value as object) })) : [];
  }),
  snapshots: builderProcedure.input(projectInput).handler(async ({ context, input }) => { await assertProject(context, input.projectId); return db.select().from(builderSnapshot).where(eq(builderSnapshot.projectId, input.projectId)).orderBy(desc(builderSnapshot.createdAt)); })
  ,apply: builderProcedure.input(projectInput.extend({ sessionId: z.string().min(1), operations: z.array(z.object({ type: z.enum(["create", "update", "delete"]), path: z.string(), content: z.string().max(MAX_FILE_SIZE).optional() })).min(1).max(MAX_OPERATIONS) })).handler(async ({ context, input }) => {
    await assertProject(context, input.projectId);
    const normalized = input.operations.map((op, order) => ({ ...op, path: safePath(op.path), order }));
    if (normalized.some((op) => op.type !== "delete" && op.content === undefined)) throw new ORPCError("BAD_REQUEST");
    return db.transaction(async (tx) => {
      const [session] = await tx.select().from(builderSession).where(and(eq(builderSession.id, input.sessionId), eq(builderSession.projectId, input.projectId), eq(builderSession.workspaceId, context.organization.id))).for("update");
      if (!session || session.status === "cancelled" || session.status === "completed") throw new ORPCError("CONFLICT");
      const [parent] = await tx.select().from(builderSnapshot).where(eq(builderSnapshot.projectId, input.projectId)).orderBy(desc(builderSnapshot.createdAt)).limit(1).for("update");
      const manifest = { ...((parent?.manifest ?? {}) as Record<string, { content: string; hash: string; size: number }>) };
      for (const op of normalized) {
        if (op.type === "delete") delete manifest[op.path];
        else { const content = op.content ?? ""; manifest[op.path] = { content, hash: hash(content), size: content.length }; }
      }
      await tx.insert(builderOperation).values(normalized.map((op) => ({ id: randomUUID(), sessionId: session.id, type: op.type, path: op.path, content: op.content ?? null, order: op.order, status: "completed" })));
      const [snapshot] = await tx.insert(builderSnapshot).values({ id: randomUUID(), projectId: input.projectId, parentId: parent?.id ?? null, createdBy: context.session.user.id, source: "builder", summary: "Applied project changes", manifest }).returning();
      await tx.update(builderSession).set({ status: "completed", updatedAt: new Date() }).where(eq(builderSession.id, session.id));
      return snapshot;
    });
  })
  ,cancel: builderProcedure.input(projectInput.extend({ sessionId: z.string().min(1) })).handler(async ({ context, input }) => {
    await assertProject(context, input.projectId);
    const [updated] = await db.update(builderSession).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(builderSession.id, input.sessionId), eq(builderSession.projectId, input.projectId), eq(builderSession.workspaceId, context.organization.id))).returning({ id: builderSession.id, status: builderSession.status });
    if (!updated) throw new ORPCError("NOT_FOUND");
    return updated;
  })
};
