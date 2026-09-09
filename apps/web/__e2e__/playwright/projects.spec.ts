import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { generateTestTotpCode } from "@saasweave/api/testing/totp";

import { createStepUpFixture, type StepUpFixture } from "./step-up.fixture";

let fixture: StepUpFixture;
let sql: ReturnType<typeof postgres>;
const workspaceId = randomUUID();

test.describe("Project Control Plane browser", () => {
  test.beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("Local test database required");
    sql = postgres(process.env.DATABASE_URL, { max: 1 });
    fixture = await createStepUpFixture();
    await sql`insert into organization(id,name,slug,created_at) values (${workspaceId},'Project Browser Workspace',${workspaceId},now())`;
    await sql`insert into member(id,organization_id,user_id,role,created_at) values (${randomUUID()},${workspaceId},${fixture.admin.id},'owner',now())`;
    await sql`insert into feature_flag(key,name,description,category,enabled,available_on,created_at,updated_at) values ('builder_access','Builder access','Builder access','builder',true,'[]'::jsonb,now(),now()) on conflict (key) do update set enabled=true`;
    await sql`insert into organization_feature_flag(id,organization_id,feature_key,enabled,updated_at) values (${randomUUID()},${workspaceId},'builder_access',true,now()) on conflict (organization_id,feature_key) do update set enabled=true`;
    await sql`update session set active_organization_id = ${workspaceId} where user_id = ${fixture.admin.id}`;
  });

  test.afterAll(async () => {
    await sql`delete from organization where id = ${workspaceId}`;
    await fixture?.dispose();
    await sql?.end({ timeout: 5 });
  });

  test("creates, edits, filters and archives a project", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/sign-in?redirect=/app/projects");
    await page.getByLabel(/Email|E-mail|Correo electrónico/i).fill(fixture.admin.email);
    await page
      .getByLabel(/Password|Senha|Contraseña/i, { exact: true })
      .fill(fixture.admin.password);
    await page
      .getByRole("button", { name: /Sign in|Entrar|Iniciar sesión|Ingresar/i, exact: true })
      .click();
    await page
      .getByLabel(/Authenticator code|Código do autenticador|Código de autenticación/i)
      .fill(await generateTestTotpCode(fixture.admin.secret));
    await page
      .getByRole("button", { name: /Verify sign in|Confirmar entrada|Confirmar inicio/i })
      .click();
    await expect(page).toHaveURL(/\/app\/projects/);

    await page.getByLabel(/Project name|Nome do projeto|Nombre del proyecto/i).fill("Browser CRM");
    await page
      .getByLabel(/Project description|Descrição do projeto|Descripción del proyecto/i)
      .fill("Initial description");
    await page.getByRole("button", { name: /New project|Novo projeto|Nuevo proyecto/i }).click();
    await expect(page.getByRole("heading", { name: "Browser CRM" })).toBeVisible();
    await page
      .getByRole("link", {
        name: /Project settings|Configurações do projeto|Configuración del proyecto/i
      })
      .click();
    await page
      .getByLabel(/Project name|Nome do projeto|Nombre del proyecto/i)
      .fill("Browser CRM Renamed");
    await page
      .getByLabel(/Project description|Descrição do projeto|Descripción del proyecto/i)
      .fill("Updated description");
    await page
      .getByRole("button", { name: /Save changes|Salvar alterações|Guardar cambios/i })
      .click();
    await page
      .getByRole("button", { name: /Archive project|Arquivar projeto|Archivar proyecto/i })
      .click();
    await page
      .getByRole("button", {
        name: /Archive project|Arquivar projeto|Archivar proyecto/i,
        exact: true
      })
      .last()
      .click();
    await page.goto("/app/projects");
    await expect(page.getByText("Browser CRM Renamed", { exact: true })).toHaveCount(0);
    await page
      .getByLabel(/Project status|Status|Estado/i)
      .selectOption("archived");
    await expect(page.getByText("Browser CRM Renamed", { exact: true })).toBeVisible();
  });

  test("renders, stops and restarts a real sandbox preview", async ({ page }) => {
    test.setTimeout(240_000);
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) =>
      networkErrors.push(`${request.method()} ${request.url()}`)
    );

    await page.goto("/sign-in?redirect=/app/projects");
    await page.locator("#email").fill(fixture.admin.email);
    await page.locator("#password").fill(fixture.admin.password);
    await page.locator('form button[type="submit"]').first().click();
    await expect(page.locator("#two-factor-code")).toBeVisible({ timeout: 20_000 });
    await page.locator("#two-factor-code").fill(await generateTestTotpCode(fixture.admin.secret));
    await page
      .getByRole("button", { name: /Verify sign in|Confirmar entrada|Confirmar inicio/i })
      .click();
    await expect(page).toHaveURL(/\/app\/projects/);

    await page
      .getByLabel(/Project name|Nome do projeto|Nombre del proyecto/i)
      .fill("Preview Browser Project");
    await page.getByRole("button", { name: /New project|Novo projeto|Nuevo proyecto/i }).click();
    await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]+$/);
    const projectId = new URL(page.url()).pathname.split("/").filter(Boolean).at(-1)!;
    await page.goto(`/app/projects/${projectId}/build`);
    await expect(page.getByRole("heading", { name: "Builder", level: 1 })).toBeVisible();
    await page
      .getByRole("button", { name: /Create first|Crie seu primeiro|Crea tu primer/i })
      .click();
    await page
      .getByRole("textbox", {
        name: /Project brief|Briefing do projeto|Resumen del proyecto/i
      })
      .fill("Create a lightweight project dashboard");
    await page
      .getByRole("button", { name: /Save changes|Salvar alterações|Guardar cambios/i })
      .click();
    await page
      .getByRole("button", {
        name: /Apply planned change|Aplicar alteração planejada|Aplicar cambio planificado/i
      })
      .click();
    await expect(page.getByText(/9 files|9 arquivos|9 archivos/i)).toBeVisible();
    await page
      .getByRole("button", { name: /Start preview|Iniciar pré-visualização|Iniciar vista previa/i })
      .click();
    await expect(
      page.getByText(/Preview ready|Pré-visualização pronta|Vista previa lista/i)
    ).toBeVisible({ timeout: 120_000 });
    const iframe = page.locator(
      'iframe[title="Generated application preview"], iframe[title="Pré-visualização do aplicativo gerado"], iframe[title="Vista previa de la aplicación generada"]'
    );
    const previewUrl = await iframe.getAttribute("src");
    expect(previewUrl).toBeTruthy();
    const previewResponse = await page.request.get(new URL(previewUrl!, page.url()).toString());
    expect(previewResponse.status(), await previewResponse.text()).toBe(200);
    const frame = page.frameLocator(
      'iframe[title="Generated application preview"], iframe[title="Pré-visualização do aplicativo gerado"], iframe[title="Vista previa de la aplicación generada"]'
    );
    await expect(frame.getByText("Plan for: Create a lightweight project dashboard")).toBeVisible({
      timeout: 30_000
    });

    await page
      .getByRole("button", {
        name: /Restart preview|Reiniciar pré-visualização|Reiniciar vista previa/i
      })
      .click();
    await expect(
      page.getByText(/Preview ready|Pré-visualização pronta|Vista previa lista/i)
    ).toBeVisible({ timeout: 120_000 });
    await expect(frame.getByText("Plan for: Create a lightweight project dashboard")).toBeVisible({
      timeout: 30_000
    });

    await page
      .getByRole("button", { name: /Stop preview|Parar pré-visualização|Detener vista previa/i })
      .click();
    await expect(
      page.getByRole("button", {
        name: /Start preview|Iniciar pré-visualização|Iniciar vista previa/i
      })
    ).toBeVisible({ timeout: 30_000 });
    await page
      .getByRole("textbox", {
        name: /Project brief|Briefing do projeto|Resumen del proyecto/i
      })
      .fill("Add a customer activity timeline");
    await page
      .getByRole("button", { name: /Save changes|Salvar alterações|Guardar cambios/i })
      .click();
    await page
      .getByRole("button", {
        name: /Apply planned change|Aplicar alteração planejada|Aplicar cambio planificado/i
      })
      .click();
    await expect(page.getByText(/9 files|9 arquivos|9 archivos/i)).toBeVisible();
    await page
      .getByRole("button", { name: /Start preview|Iniciar pré-visualização|Iniciar vista previa/i })
      .click();
    await expect(
      page.getByText(/Preview ready|Pré-visualização pronta|Vista previa lista/i)
    ).toBeVisible({ timeout: 120_000 });
    await expect(frame.getByText("Plan for: Add a customer activity timeline")).toBeVisible({
      timeout: 30_000
    });

    await page
      .getByRole("button", { name: /Stop preview|Parar pré-visualização|Detener vista previa/i })
      .click();
    await expect(
      page.getByRole("button", {
        name: /Start preview|Iniciar pré-visualização|Iniciar vista previa/i
      })
    ).toBeVisible({ timeout: 30_000 });

    expect(
      consoleErrors.filter(
        (entry) => !entry.includes("favicon") && !entry.includes("github.com/tsu-moe.png")
      )
    ).toEqual([]);
    expect(
      networkErrors.filter(
        (entry) => !entry.includes("favicon") && !entry.includes("github.com/tsu-moe.png")
      )
    ).toEqual([]);
  });
});
