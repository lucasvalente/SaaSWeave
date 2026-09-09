import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { generateTestTotpCode } from "@saasweave/api/testing/totp";

import { createStepUpFixture, type StepUpFixture } from "./step-up.fixture";

const disabledFeatures = ["billing_portal", "team_management", "notifications"] as const;

let fixture: StepUpFixture;
let sql: ReturnType<typeof postgres>;
let workspaceId: string;

test.describe("Console feature gates", () => {
  test.beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("Local test database required");

    sql = postgres(process.env.DATABASE_URL, { max: 1 });
    fixture = await createStepUpFixture();

  });

  test.afterAll(async () => {
    if (workspaceId) {
      await sql`delete from organization_feature_flag where organization_id = ${workspaceId} and feature_key = any(${disabledFeatures})`;
    }
    await fixture?.dispose();
    await sql?.end({ timeout: 5 });
  });

  test("hides disabled shell controls and denies disabled feature deep links", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/sign-in?redirect=/app");
    await page.locator("#email").fill(fixture.admin.email);
    await page.locator("#password").fill(fixture.admin.password);
    await page
      .getByRole("button", { name: /Sign in|Entrar|Iniciar sesión|Ingresar/i, exact: true })
      .click();
    await page
      .getByLabel(/Authenticator code|Código do autenticador|Código de autenticación/i)
      .fill(await generateTestTotpCode(fixture.admin.secret));
    await page
      .getByRole("button", { name: /Verify sign in|Confirmar entrada|Confirmar inicio/i })
      .click();
    await expect(page).toHaveURL(/\/app\/?$/);
    // MFA navigation can render the console from the client cache before the
    // browser applies the Set-Cookie response. The deep-link check must start
    // from an actual persisted session, just like a direct navigation does.
    await expect
      .poll(async () => (await page.context().cookies()).some((cookie) => cookie.name === "better-auth.session_token"))
      .toBe(true);

    const [session] = await sql<{ active_organization_id: string }[]>`select active_organization_id from session where user_id = ${fixture.admin.id} order by created_at desc limit 1`;
    if (!session?.active_organization_id) throw new Error("Test session has no active workspace");
    workspaceId = session.active_organization_id;
    for (const key of disabledFeatures) {
      await sql`insert into organization_feature_flag(id, organization_id, feature_key, enabled, updated_at) values (${randomUUID()}, ${workspaceId}, ${key}, false, now()) on conflict (organization_id, feature_key) do update set enabled = false, updated_at = now()`;
    }
    await page.reload();

    await expect(page.getByRole("link", { name: /Billing|Cobrança|Facturación/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Team|Equipe|Equipo/i })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Notifications|Notificações|Notificaciones/i })
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Projects|Projetos|Proyectos/i })).toBeVisible();

    for (const path of ["/app/billing", "/app/team", "/app/notifications"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/app\/?$/);
    }
  });
});
