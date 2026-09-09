import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { z } from "zod";

import { sql, gt, eq } from "drizzle-orm";

import { checkRedisReady } from "@saasweave/cache";
import { checkIsDbReady, db, getPlatformRoles, recordAudit } from "@saasweave/db";
import { auditLog, featureFlag, invoice, organization, organizationFeatureFlag, project, securityEvent, session, user, workspaceSubscription } from "@saasweave/db/schema";
import { ENV_SERVER } from "@saasweave/env/server/env";
import { checkQueueReady, getQueue, QUEUE_NAMES, type QueueName } from "@saasweave/jobs/queues";
import { can } from "@saasweave/permissions";

import { requirePlatformPermission } from "#@/lib/procedures/factory";

/** Keep operational diagnostics useful without returning credentials or tokens. */
function safeFailureReason(reason: string | undefined): string | undefined {
  if (!reason) return undefined;
  return reason
    .replace(/(authorization|cookie|set-cookie|token|secret|password|api[-_ ]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .slice(0, 500);
}

async function checkStorage() {
  if (ENV_SERVER.MINIO_ENDPOINT) {
    const response = await fetch(new URL("/minio/health/ready", ENV_SERVER.MINIO_ENDPOINT), {
      signal: AbortSignal.timeout(1500)
    });
    return { status: response.ok ? "healthy" : "unhealthy" };
  }
  await access(ENV_SERVER.MEDIA_UPLOAD_DIR, constants.R_OK | constants.W_OK);
  return { status: "healthy" };
}
async function boundedCheck(check: () => Promise<{ status: string; configured?: boolean }>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const started = performance.now();
  try {
    const result = await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 2000);
      })
    ]);
    return {
      status: result.configured === false ? "unconfigured" : result.status,
      latencyMs: Math.round(performance.now() - started)
    };
  } catch {
    return { status: "unhealthy", latencyMs: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(timer);
  }
}
export async function adminHealth() {
  const [postgres, redis, queue, storage] = await Promise.all([
    boundedCheck(async () => {
      return { status: (await checkIsDbReady()) ? "healthy" : "unhealthy" };
    }),
    boundedCheck(checkRedisReady),
    boundedCheck(checkQueueReady),
    boundedCheck(checkStorage)
  ]);
  return {
    api: { status: "healthy", latencyMs: 0 },
    postgres,
    redis,
    queue,
    storage,
    checkedAt: new Date().toISOString()
  };
}
export const adminSystemRouter = {
  health: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .handler(adminHealth),
  queues: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .handler(async () => Promise.all((Object.values(QUEUE_NAMES) as QueueName[]).map(async (name) => ({
      name,
      ...(await getQueue(name).getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"))
    })))),
  jobs: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .input(z.object({ queue: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .handler(async ({ input }) => {
      const names = input.queue ? [input.queue as QueueName] : (Object.values(QUEUE_NAMES) as QueueName[]);
      const rows = [] as Array<Record<string, unknown>>;
      for (const name of names) {
        if (!Object.values(QUEUE_NAMES).includes(name)) continue;
        const jobs = await getQueue(name).getJobs(["failed", "waiting", "active"], 0, input.limit - 1, false);
        rows.push(...jobs.map((job) => ({ id: job.id, queue: name, name: job.name, attemptsMade: job.attemptsMade, timestamp: job.timestamp, processedOn: job.processedOn, finishedOn: job.finishedOn, failedReason: safeFailureReason(job.failedReason) })));
      }
      return rows.slice(0, input.limit);
    }),
  job: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .input(z.object({ queue: z.string(), jobId: z.string().min(1) }))
    .handler(async ({ input }) => {
      if (!Object.values(QUEUE_NAMES).includes(input.queue as QueueName)) return null;
      const queue = getQueue(input.queue as QueueName);
      const job = await queue.getJob(input.jobId);
      if (!job) return null;
      const state = await job.getState();
      return {
        id: job.id,
        queue: input.queue,
        name: job.name,
        state,
        attemptsMade: job.attemptsMade,
        attempts: job.opts.attempts ?? 1,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: safeFailureReason(job.failedReason),
        // Job payloads are intentionally never exposed by the admin API.
      };
    }),
  failed: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .input(z.object({ queue: z.string().optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .handler(async ({ input }) => {
      const names = input.queue ? [input.queue as QueueName] : (Object.values(QUEUE_NAMES) as QueueName[]);
      const rows: Array<Record<string, unknown>> = [];
      for (const name of names) {
        if (!Object.values(QUEUE_NAMES).includes(name)) continue;
        const jobs = await getQueue(name).getJobs(["failed"], 0, input.limit - 1, false);
        rows.push(...jobs.map((job) => ({
          id: job.id, queue: name, name: job.name, state: "failed",
          attemptsMade: job.attemptsMade, timestamp: job.timestamp,
          failedReason: safeFailureReason(job.failedReason)
        })));
      }
      return rows.slice(0, input.limit);
    }),
  workers: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .handler(async () => {
      const workers = [] as Array<Record<string, unknown>>;
      for (const name of Object.values(QUEUE_NAMES) as QueueName[]) {
        try {
          const entries = await getQueue(name).getWorkers();
          workers.push(...entries.map((entry) => ({
            id: entry.id,
            queue: name,
            address: entry.address,
            age: entry.age,
            idle: entry.idle,
            // BullMQ exposes only operational metadata here; no job payloads.
          })));
        } catch {
          // A queue unavailable during inspection is represented by its absence.
        }
      }
      return workers;
    }),
  incidents: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .handler(async ({ input }) => {
      const incidents: Array<Record<string, unknown>> = [];
      for (const name of Object.values(QUEUE_NAMES) as QueueName[]) {
        const jobs = await getQueue(name).getJobs(["failed"], 0, input.limit - 1, false);
        incidents.push(...jobs.map((job) => ({
          id: `${name}:${job.id}`,
          type: "job_failure",
          severity: "warning",
          queue: name,
          jobId: job.id,
          jobName: job.name,
          occurredAt: job.finishedOn ?? job.timestamp,
          message: safeFailureReason(job.failedReason) ?? "Job failed"
        })));
      }
      return incidents.slice(0, input.limit);
    }),
  observability: requirePlatformPermission("infrastructure.read")
    .route({ method: "GET" })
    .handler(async () => ({
      links: [
        { name: "health", href: "/admin/system/health" },
        { name: "queues", href: "/admin/system/queues" },
        { name: "jobs", href: "/admin/system/jobs" },
        { name: "workers", href: "/admin/system/workers" },
        { name: "incidents", href: "/admin/system/incidents" }
      ]
    })),
  retry: requirePlatformPermission("jobs.retry")
    .route({ method: "POST" })
    .input(z.object({ queue: z.string(), jobId: z.string().min(1), reason: z.string().trim().min(5).max(500) }))
    .handler(async ({ context, input }) => {
      const safeQueues = new Set<string>([QUEUE_NAMES.EMAIL, QUEUE_NAMES.NOTIFICATIONS, QUEUE_NAMES.DATA_EXPORT]);
      if (!safeQueues.has(input.queue as QueueName)) throw new Error("JOB_RETRY_NOT_ALLOWED");
      const job = await getQueue(input.queue as QueueName).getJob(input.jobId);
      if (!job || (await job.getState()) !== "failed") throw new Error("JOB_NOT_RETRYABLE");
      await job.retry();
      await recordAudit({ actorId: context.session.user.id, actorName: context.session.user.name, action: "system.job_retried", targetType: "job", targetLabel: input.jobId, metadata: { queue: input.queue, reason: safeFailureReason(input.reason) } });
      return { retried: true, queue: input.queue, jobId: input.jobId };
    }),
  overview: requirePlatformPermission("platform.dashboard.read")
    .route({ method: "GET" })
    .handler(async ({ context }) => {
      const roles = await getPlatformRoles(context.session.user.id, context.session.user.role);
      const query = async <T>(work: () => Promise<T>): Promise<T | null> => {
        try { return await work(); } catch { return null; }
      };
      const [users, workspaces, activeWorkspaces, suspendedWorkspaces, projects, activeProjects, archivedProjects, subscriptions, activeSubscriptions, invoices, openInvoices, flags, enabledFlags, overrides, sessions, audit, security, health] = await Promise.all([
        can(roles, "users.read")
          ? db.select({ count: sql<number>`count(*)::int` }).from(user)
          : null,
        can(roles, "workspaces.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(organization).where(eq(organization.operationalStatus, "active"))) : null,
        can(roles, "workspaces.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(organization).where(eq(organization.operationalStatus, "suspended"))) : null,
        can(roles, "projects.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(project)) : null,
        can(roles, "projects.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(project).where(eq(project.status, "active"))) : null,
        can(roles, "projects.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(project).where(eq(project.status, "archived"))) : null,
        can(roles, "subscriptions.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(workspaceSubscription)) : null,
        can(roles, "subscriptions.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(workspaceSubscription).where(eq(workspaceSubscription.status, "active"))) : null,
        can(roles, "billing.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(invoice)) : null,
        can(roles, "billing.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(invoice).where(eq(invoice.status, "open"))) : null,
        can(roles, "feature_flags.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(featureFlag)) : null,
        can(roles, "feature_flags.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(featureFlag).where(eq(featureFlag.enabled, true))) : null,
        can(roles, "feature_flags.read") ? query(() => db.select({ count: sql<number>`count(*)::int` }).from(organizationFeatureFlag)) : null,
        can(roles, "workspaces.read")
          ? db.select({ count: sql<number>`count(*)::int` }).from(organization)
          : null,
        can(roles, "sessions.read")
          ? db
              .select({ count: sql<number>`count(*)::int` })
              .from(session)
              .where(gt(session.expiresAt, new Date()))
          : null,
        can(roles, "audit.read")
          ? db.select({ count: sql<number>`count(*)::int` }).from(auditLog)
          : null,
        can(roles, "security.events.read")
          ? db
              .select({ count: sql<number>`count(*)::int` })
              .from(securityEvent)
              .where(eq(securityEvent.severity, "critical"))
          : null,
        can(roles, "infrastructure.read") ? adminHealth() : null
      ]);
      const count = (rows: Array<{ count: number }> | null) => rows?.[0]?.count ?? null;
      return {
        users: count(users),
        workspaces: count(workspaces),
        workspacesSummary: { total: count(workspaces), active: count(activeWorkspaces), suspended: count(suspendedWorkspaces) },
        projectsSummary: { total: count(projects), active: count(activeProjects), archived: count(archivedProjects) },
        subscriptionsSummary: { total: count(subscriptions), active: count(activeSubscriptions) },
        billingSummary: { totalInvoices: count(invoices), openInvoices: count(openInvoices) },
        featureFlagsSummary: { total: count(flags), enabled: count(enabledFlags), overrides: count(overrides) },
        sessions: count(sessions),
        audit: count(audit),
        criticalSecurityEvents: count(security),
        health
      };
    })
};
