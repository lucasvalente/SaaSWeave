import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { generateTestTotpCode } from "@saasweave/api/testing/totp";

import { createStepUpFixture, type StepUpFixture } from "./step-up.fixture";

const required = ["M2_SUPABASE_URL_A", "M2_SUPABASE_URL_B", "M2_SUPABASE_ANON_KEY"] as const;
const authUrl = /auth|sign-in|two-factor|mfa/i;

async function measured<T>(step: string, action: () => Promise<T>): Promise<T> {
  const started = Date.now();
  console.log(`[SUPABASE_AB][STEP ${step}][START]`);
  try {
    const result = await action();
    console.log(`[SUPABASE_AB][STEP ${step}][PASS] duration=${Date.now() - started}ms`);
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.log(`[SUPABASE_AB][STEP ${step}][FAIL] duration=${Date.now() - started}ms reason=${reason}`);
    throw error;
  }
}

test.describe("Supabase preview A/B", () => {
  test("injects each project's public Supabase configuration into its real preview", async ({ page }) => {
    test.setTimeout(240_000);
    if (!process.env.DATABASE_URL || required.some((key) => !process.env[key])) throw new Error("M2_SUPABASE_E2E_ENV_MISSING");

    const configA = { ref: `preview-a-${randomUUID()}`, url: process.env.M2_SUPABASE_URL_A!, key: process.env.M2_SUPABASE_ANON_KEY! };
    const configB = { ref: `preview-b-${randomUUID()}`, url: process.env.M2_SUPABASE_URL_B!, key: process.env.M2_SUPABASE_ANON_KEY! };
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });
    const fixture: StepUpFixture = await createStepUpFixture();

    try {
      page.on("pageerror", (error) => console.log(`[SUPABASE_AB][PAGE_ERROR] ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") console.log(`[SUPABASE_AB][CONSOLE_ERROR] ${message.text()}`);
      });
      page.on("requestfailed", (request) => console.log(`[SUPABASE_AB][REQUEST_FAILED] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`));
      page.on("response", (response) => {
        if (authUrl.test(response.url())) {
          void response.headerValue("set-cookie").then((header) => {
            const names = header?.split(",").map((entry) => entry.trim().split("=")[0]).filter(Boolean).join(",") ?? "none";
            console.log(`[SUPABASE_AB][AUTH_HTTP] ${response.status()} ${response.request().method()} ${response.url()} set-cookie=${names}`);
          });
        }
        if (response.status() >= 400 && authUrl.test(response.url())) console.log(`[SUPABASE_AB][AUTH_HTTP_ERROR] ${response.status()} ${response.request().method()} ${response.url()}`);
        if (response.url().includes("/rpc/console/sandbox/create")) {
          void response.text().then((body) => console.log(`[SUPABASE_AB][PREVIEW_CREATE_HTTP] ${response.status()} body=${body.slice(0, 240)}`)).catch(() => undefined);
        }
      });
      console.log("[SUPABASE_AB][STEP 00][PASS] bootstrap=ready");
      await sql`insert into feature_flag(key,name,description,category,enabled,available_on,created_at,updated_at) values ('builder_access','Builder access','Builder access','builder',true,'[]'::jsonb,now(),now()) on conflict (key) do update set enabled=true`;

      await test.step("01 authenticate fixture administrator", async () => {
        await measured("01", () => page.goto("/sign-in?redirect=/app/projects", { waitUntil: "domcontentloaded", timeout: 15_000 }));
        await measured("02", async () => {
          // These stable controls are intentionally preferred over translated
          // labels: typography can insert spacing around the localized hyphen.
          await page.locator("#email").fill(fixture.admin.email, { timeout: 10_000 });
          await page.locator("#password").fill(fixture.admin.password, { timeout: 10_000 });
          await page.getByRole("button", { name: /Sign in|Entrar|Iniciar sesión|Ingresar/i, exact: true }).click({ timeout: 10_000 });
        });
        const mfa = page.getByLabel(/Authenticator code|Código do autenticador|Código de autenticación/i);
        await measured("03", () => mfa.waitFor({ state: "visible", timeout: 20_000 }));
        await measured("04", async () => {
          const code = await generateTestTotpCode(fixture.admin.secret);
          await mfa.fill(code, { timeout: 10_000 });
          await page.getByRole("button", { name: /Verify sign in|Confirmar entrada|Confirmar inicio/i }).click({ timeout: 10_000 });
        });
        await measured("05", async () => {
          await expect(page).toHaveURL(/\/app\/projects/, { timeout: 20_000 });
          const cookies = await page.context().cookies();
          console.log(`[SUPABASE_AB][SESSION] cookies=${cookies.map((cookie) => `${cookie.name};domain=${cookie.domain};path=${cookie.path};secure=${cookie.secure}`).join(",")}`);
          await page.reload({ waitUntil: "domcontentloaded" });
          await expect(page).toHaveURL(/\/app\/projects/, { timeout: 20_000 });
        });
      });

      const [activeSession] = await sql<{ active_organization_id: string | null }[]>`select active_organization_id from session where user_id=${fixture.admin.id} order by created_at desc limit 1`;
      const workspaceId = activeSession?.active_organization_id;
      if (!workspaceId) throw new Error("M2_SUPABASE_E2E_ACTIVE_WORKSPACE_MISSING");
      await sql`insert into organization_feature_flag(id,organization_id,feature_key,enabled,updated_at) values (${randomUUID()},${workspaceId},'builder_access',true,now()) on conflict (organization_id,feature_key) do update set enabled=true`;

      for (const [label, config] of [["A", configA], ["B", configB]] as const) {
        await test.step(`02-${label} configure and start real preview`, async () => {
          await test.step(`${label}.1 create project`, async () => {
            const step = label === "A" ? "06" : "11";
            await measured(step, async () => {
            await page.goto("/app/projects", { waitUntil: "domcontentloaded", timeout: 15_000 });
            console.log(`[SUPABASE_AB][STEP ${step}][CHECKPOINT] url=${new URL(page.url()).pathname}`);
            await page.getByLabel(/Project name|Nome do projeto|Nombre del proyecto/i).fill(`Supabase Preview ${label}`, { timeout: 15_000 });
            await page.getByRole("button", { name: /New project|Novo projeto|Nuevo proyecto/i }).click({ timeout: 10_000 });
            await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]+$/, { timeout: 20_000 });
            const projectId = new URL(page.url()).pathname.split("/").at(-1)!;
            await page.goto(`/app/projects/${projectId}/settings`, { waitUntil: "domcontentloaded", timeout: 15_000 });
            await expect(page.getByRole("heading", { name: /Supabase connection|Conexão Supabase|Conexión Supabase/i })).toBeVisible({ timeout: 15_000 });
            });
            console.log(`[M2 Supabase Preview] ${label} project settings ready`);
          });
          const projectId = new URL(page.url()).pathname.split("/").at(-2)!;
          if (process.env.M2_SUPABASE_E2E_PHASE === "route") return;
          await test.step(`${label}.2 persist canonical public config`, async () => {
          await measured(label === "A" ? "07" : "12", async () => {
          await page.getByLabel(/Project reference|Referência do projeto|Referencia del proyecto/i).fill(config.ref);
          await page.getByLabel(/Project URL|URL do projeto|URL del proyecto/i).fill(config.url);
          await page.getByLabel(/Publishable anon key|Chave anônima publicável|Clave anónima publicable/i).fill(config.key);
          const configured = page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              response.url().toLowerCase().includes("projectsupabase")
          );
          await page.getByRole("button", { name: /Save connection|Salvar conexão|Guardar conexión/i }).click();
          expect((await configured).ok()).toBe(true);
          });
          });
          if (process.env.M2_SUPABASE_E2E_PHASE === "config") return;
          await test.step(`${label}.3 generate committed snapshot`, async () => {
          await measured(label === "A" ? "08" : "13", async () => {
          await page.goto(`/app/projects/${projectId}/build`);
          await page.getByRole("button", { name: /Create first|Crie seu primeiro|Crea tu primer/i }).click();
          });
          });
          await test.step(`${label}.4 start preview`, async () => {
          await measured(label === "A" ? "09" : "14", async () => {
          await page.getByRole("button", { name: /^(Start preview|Iniciar pré-visualização|Iniciar vista previa)$/i }).click();
          await expect(page.getByText(/Preview ready|Pré-visualização pronta|Vista previa lista/i)).toBeVisible({ timeout: 120_000 });
          });
          });
          await test.step(`${label}.5 assert browser Supabase probe`, async () => {
          await measured(label === "A" ? "10" : "15", async () => {
          const frame = page.frameLocator('iframe[title="Generated application preview"], iframe[title="Pré-visualização do aplicativo gerado"], iframe[title="Vista previa de la aplicación generada"]');
          await expect(frame.locator("#supabase-runtime-status[data-configured='true'][data-status='connected']")).toBeVisible({ timeout: 30_000 });
          await expect(frame.locator("body")).toContainText("Generated app");
          expect(await frame.locator("body").evaluate(() => (window as Window & { __SAASWEAVE_SUPABASE_CONFIG__?: { url?: string } }).__SAASWEAVE_SUPABASE_CONFIG__?.url)).toBe(config.url);
          });
          });
        });
      }
    } finally {
      console.log("[SUPABASE_AB][STEP 16][START]");
      await fixture.dispose();
      await sql.end({ timeout: 5 });
      console.log("[SUPABASE_AB][STEP 16][PASS] cleanup=complete");
    }
  });
});
