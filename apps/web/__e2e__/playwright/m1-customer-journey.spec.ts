import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

const password = "CustomerJourneyPass1";
const journeyName = `Customer journey ${randomUUID().slice(0, 8)}`;
const projectName = `Journey project ${randomUUID().slice(0, 8)}`;

function uniqueEmail() {
  return `customer-journey-${randomUUID()}@example.com`;
}

test.describe("M1 customer journey", () => {
  test.describe.configure({ mode: "serial" });

  test("signs up, onboards, creates a project, and publishes a changed preview", async ({ page }) => {
    test.setTimeout(240_000);
    if (!process.env.DATABASE_URL) throw new Error("Local test database required");

    const email = uniqueEmail();
    const sql = postgres(process.env.DATABASE_URL, { max: 1 });

    try {
      console.log("M1_STEP=01 signup");
      await page.goto("/create-an-account");
      await page.getByLabel(/Name|Nome|Nombre/i).fill("Customer Journey");
      // These stable form IDs avoid locale typography differences such as "E- mail".
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page.locator("#confirmPassword").fill(password);
      await page
        .getByRole("button", {
          name: /Create Account|Criar conta|Crear cuenta/i
        })
        .click();

      await expect(page).toHaveURL(/\/onboarding/);
      console.log("M1_STEP=02 onboarding");
      await page.locator("#onboarding-workspace-name").fill(journeyName);
      await page.getByRole("button", { name: /Continue|Continuar/i }).click();
      console.log("M1_STEP=02 onboarding workspace saved");
      await expect(
        page.getByRole("heading", { name: /Invite your team|Convide sua equipe|Invita a tu equipo/i })
      ).toBeVisible();
      await page.getByRole("button", { name: /Skip for now|Pular por enquanto|Omitir por ahora/i }).click();
      await expect(page).toHaveURL(/\/app\/projects/);
      console.log("M1_STEP=03 create project");

      const [workspace] = await sql<{ id: string }[]>`
        select m.organization_id as id
        from member m
        join "user" u on u.id = m.user_id
        where u.email = ${email}
        order by m.created_at desc
        limit 1
      `;
      if (!workspace) throw new Error("Onboarding did not create an active workspace");

      // The journey uses the real feature guard. The scoped override only gives this
      // newly-created test workspace the Builder entitlement needed for the flow.
      await sql`
        insert into feature_flag(key,name,description,category,enabled,available_on,created_at,updated_at)
        values ('builder_access','Builder access','Builder access','Core',true,'[]'::jsonb,now(),now())
        on conflict (key) do update set enabled = true
      `;
      await sql`
        insert into organization_feature_flag(id,organization_id,feature_key,enabled,updated_at)
        values (${randomUUID()},${workspace.id},'builder_access',true,now())
        on conflict (organization_id,feature_key) do update set enabled = true, updated_at = now()
      `;

      await page.getByLabel(/Project name|Nome do projeto|Nombre del proyecto/i).fill(projectName);
      await page
        .getByRole("button", { name: /New project|Novo projeto|Nuevo proyecto/i })
        .click();
      await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]+(?:\/build)?$/);
      console.log("M1_STEP=04 enter Builder");
      const projectPath = new URL(page.url()).pathname.split("/").filter(Boolean);
      const projectId = projectPath[2]!;
      await page.goto(`/app/projects/${projectId}/build`);
      await expect(page.getByRole("heading", { name: "Builder", level: 1 })).toBeVisible();
      const createFirst = page.getByRole("button", {
        name: /Create first|Crie seu primeiro|Crea tu primer/i
      });
      await expect(createFirst).toBeVisible({ timeout: 15_000 });
      await createFirst.click();

      console.log("M1_STEP=05 generation A");
      const brief = page.getByRole("textbox", {
        name: /Project brief|Briefing do projeto|Resumen del proyecto/i
      });
      await brief.fill("Create a simple customer dashboard");
      await page.getByRole("button", { name: /Save changes|Salvar alterações|Guardar cambios/i }).click();
      await page
        .getByRole("button", {
          name: /Apply planned change|Aplicar alteração planejada|Aplicar cambio planificado/i
        })
        .click();
      await expect(page.getByText(/9 files|9 arquivos|9 archivos/i)).toBeVisible();
      await page.reload();
      await expect(page.getByRole("heading", { name: "Builder", level: 1 })).toBeVisible();

      console.log("M1_STEP=06 snapshot A / 07 preview A");
      const startPreview = page.getByRole("button", {
        // Anchors prevent Portuguese \"Reiniciar pré-visualização\" from matching \"Iniciar\".
        name: /^(Start preview|Iniciar pré-visualização|Iniciar vista previa)$/i
      });
      await expect(startPreview).toBeEnabled({ timeout: 15_000 });
      await startPreview.click({ timeout: 15_000 });
      console.log("M1_STEP=07 preview A start requested");
      await expect(
        page.getByText(/Preview ready|Pré-visualização pronta|Vista previa lista/i)
      ).toBeVisible({ timeout: 120_000 });
      const frame = page.frameLocator(
        'iframe[title="Generated application preview"], iframe[title="Pré-visualização do aplicativo gerado"], iframe[title="Vista previa de la aplicación generada"]'
      );
      await expect(frame.getByText("Plan for: Create a simple customer dashboard")).toBeVisible({
        timeout: 30_000
      });
      await page
        .getByRole("button", {
          name: /Stop preview|Parar pré-visualização|Detener vista previa/i
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: /^(Start preview|Iniciar pré-visualização|Iniciar vista previa)$/i
        })
      ).toBeVisible({ timeout: 30_000 });

      console.log("M1_STEP=08 modification / 09 generation B");
      await brief.fill("Add a customer activity timeline");
      await page.getByRole("button", { name: /Save changes|Salvar alterações|Guardar cambios/i }).click();
      await page
        .getByRole("button", {
          name: /Apply planned change|Aplicar alteração planejada|Aplicar cambio planificado/i
        })
        .click();
      await page.reload();
      await expect(page.getByRole("heading", { name: "Builder", level: 1 })).toBeVisible();

      console.log("M1_STEP=10 snapshot B / 11 preview B");
      await expect(startPreview).toBeEnabled({ timeout: 15_000 });
      await startPreview.click({ timeout: 15_000 });
      console.log("M1_STEP=11 preview B start requested");
      await expect(
        page.getByText(/Preview ready|Pré-visualização pronta|Vista previa lista/i)
      ).toBeVisible({ timeout: 120_000 });

      await expect(frame.getByText("Plan for: Add a customer activity timeline")).toBeVisible({
        timeout: 30_000
      });
      const [snapshots] = await sql<{ count: string; distinct_count: string }[]>`
        select count(*)::text as count, count(distinct id)::text as distinct_count
        from builder_snapshot
        where project_id = ${projectId}
      `;
      expect(Number(snapshots?.count ?? 0)).toBeGreaterThanOrEqual(2);
      expect(snapshots?.count).toBe(snapshots?.distinct_count);
      console.log("M1_STEP=12 persistence check");
    } finally {
      await sql.end({ timeout: 5 });
    }
  });
});
