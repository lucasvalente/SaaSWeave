import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

import { generateTestTotpCode } from "@saasweave/api/testing/totp";

import { createStepUpFixture, type StepUpFixture } from "./step-up.fixture";

let admin: StepUpFixture;
let support: StepUpFixture;
let target: Awaited<ReturnType<StepUpFixture["createTarget"]>>;
let sql: ReturnType<typeof postgres>;
const workspaceA = randomUUID();
const workspaceB = randomUUID();
const projectA = randomUUID();
const projectB = randomUUID();
const auditAction = `admin.browser.${randomUUID()}`;
async function login(page: Page, fixture: StepUpFixture, path = "/admin/users") {
  // Keep the legacy assertions stable while the product default remains pt-BR.
  // Locale is an explicit test input, never a production behavior change.
  await page.context().addCookies([
    { name: "saasweave_locale", value: "en", url: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000" }
  ]);
  await page.goto(`/sign-in?redirect=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(fixture.admin.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.admin.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page
    .getByLabel("Authenticator code")
    .fill(await generateTestTotpCode(fixture.admin.secret));
  await page.getByRole("button", { name: "Verify sign in" }).click();
  await expect(page).toHaveURL(new RegExp(path));
}

test.describe("Admin V1 browser", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === "production") {
      throw new Error("Local test database required");
    }
    sql = postgres(process.env.DATABASE_URL, { max: 1 });
    admin = await createStepUpFixture();
    support = await createStepUpFixture();
    await sql`update platform_role_assignment set role = 'support' where user_id = ${support.admin.id}`;
    await sql`update "user" set role = 'user' where id = ${support.admin.id}`;
    target = await admin.createTarget();
    await sql`insert into organization(id,name,slug,created_at,subscription_status) values (${workspaceA},'Browser Workspace A',${workspaceA},now(),'trialing'),(${workspaceB},'Browser Workspace B',${workspaceB},now(),'active')`;
    await sql`insert into member(id,organization_id,user_id,role,created_at) values (${randomUUID()},${workspaceA},${target.id},'owner',now()),(${randomUUID()},${workspaceB},${support.admin.id},'owner',now())`;
    await sql`insert into project(id,workspace_id,created_by,name,slug,status,created_at,updated_at) values (${projectA},${workspaceA},${target.id},'Admin Browser Project A','admin-browser-project-a','draft',now(),now()),(${projectB},${workspaceB},${support.admin.id},'Admin Browser Project B','admin-browser-project-b','active',now(),now())`;
    await sql`insert into session(id,user_id,token,expires_at,created_at,updated_at) values (${randomUUID()},${target.id},${randomUUID()},now()+interval '1 day',now(),now())`;
    await sql`insert into audit_log(id,actor_id,actor_name,organization_id,action,target_type,created_at) values (${randomUUID()},${target.id},${target.name},${workspaceA},${auditAction},'workspace',now())`;
    await sql`insert into security_event(id,type,severity,actor_user_id,organization_id,created_at) values (${randomUUID()},'authentication.failure','critical',${target.id},${workspaceA},now())`;
  });
  test.afterAll(async () => {
    if (sql) {
      await sql`delete from organization where id in (${workspaceA},${workspaceB})`;
      await sql`delete from audit_log where action = ${auditAction}`;
      await sql`delete from security_event where actor_user_id = ${target?.id ?? ""}`;
    }
    await admin?.dispose();
    await support?.dispose();
    await sql?.end({ timeout: 5 });
  });
  test("Users, Workspaces, Sessions, Audit, Security, Health and global search", async ({
    page
  }) => {
    test.setTimeout(120000);
    await login(page, admin);
    await page.getByLabel("Search users").fill(target.email);
    await page.getByLabel("User status").selectOption("active");
    await page.getByLabel("MFA status").selectOption("disabled");
    await expect(page.getByRole("link", { name: "View", exact: true })).toHaveCount(1);
    await page.getByRole("link", { name: "View", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Identity and access" })).toBeVisible();
    await page.goto("/admin/workspaces");
    await page.getByLabel("Search workspaces").fill("Browser Workspace A");
    await page.getByLabel("Workspace status").selectOption("active");
    await expect(page.getByRole("link", { name: "Browser Workspace B", exact: true })).toHaveCount(
      0
    );
    await page.getByRole("link", { name: "Browser Workspace A", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Browser Workspace A", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Overview", { exact: true })).toBeVisible();
    await expect(page.getByText("Team", { exact: true })).toBeVisible();
    await expect(page.getByText("Recent activity", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Suspend Workspace", exact: true }).click();
    await page.getByLabel("Suspension reason").fill("Browser validation");
    await page.getByRole("button", { name: "Suspend Workspace", exact: true }).last().click();
    await expect(page.getByText("suspended", { exact: true })).toBeVisible();
    await expect(page.getByText("Browser validation", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reactivate Workspace", exact: true }).click();
    await expect(page.getByText("active", { exact: true })).toBeVisible();
    await page.goto("/admin/sessions");
    await page.getByLabel("Search sessions by email").fill(target.email);
    await expect(page.getByRole("button", { name: "Revoke session", exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Revoke session", exact: true }).click();
    await page.getByRole("button", { name: "Revoke", exact: true }).click();
    await expect(page.getByText("No sessions match this search.")).toBeVisible();
    await page.goto("/admin/audit");
    await page.getByLabel("Audit action").fill(auditAction);
    await expect(page.getByText(auditAction, { exact: false }).last()).toBeVisible();
    await page.goto("/admin/security/events");
    await page.getByLabel("Security actor").fill(target.id);
    await page.getByLabel("Security severity").selectOption("critical");
    await expect(page.getByText("authentication.failure", { exact: true })).toBeVisible();
    await page.goto("/admin/system/health");
    await expect(page.getByRole("heading", { name: "System health", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Search / Ctrl K" }).click();
    await page.getByLabel("Global admin search").fill(target.email);
    await expect(
      page.getByRole("link", { name: `${target.name} · ${target.email}` })
    ).toBeVisible();
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Platform dashboard", exact: true })
    ).toBeVisible();
    await expect(page.getByText("Active sessions", { exact: true })).toBeVisible();
    await page.goto("/admin/projects");
    await page.getByLabel("Search projects").fill("Admin Browser Project");
    await expect(page.getByRole("link", { name: "Admin Browser Project A" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin Browser Project B" })).toBeVisible();
    await page.getByRole("link", { name: "Admin Browser Project A" }).click();
    await expect(page.getByText("Browser Workspace A", { exact: true })).toBeVisible();
    await expect(page.getByText(target.email, { exact: false }).first()).toBeVisible();
  });
  test("support sees permitted commands and is denied settings", async ({ page }) => {
    await login(page, support);
    await expect(page.getByRole("link", { name: "Platform settings", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Search / Ctrl K" }).click();
    await page.getByLabel("Global admin search").fill("settings");
    await expect(page.getByRole("link", { name: "Platform settings", exact: true })).toHaveCount(0);
    await page.goto("/admin/settings");
    await expect(page.getByText(/Permission denied/)).toBeVisible();
  });
  test("ordinary tenant cannot open the foreign workspace administration", async ({ page }) => {
    await sql`delete from platform_role_assignment where user_id = ${support.admin.id}`;
    await login(page, support, "/app");
    await page.goto(`/admin/workspaces/${workspaceA}`);
    await expect(page).toHaveURL(/\/app/);
    await expect(
      page.getByRole("heading", { name: "Browser Workspace A", exact: true })
    ).toHaveCount(0);
  });
});
