import { expect, test } from "@playwright/test";
import { generateTestTotpCode } from "@saasweave/api/testing/totp";
import { createStepUpFixture } from "./step-up.fixture";

test("super admin can reach every exposed administrative module and keep the admin root", async ({ page }) => {
  test.setTimeout(120000);
  const fixture = await createStepUpFixture();
  try {
    await page.context().addCookies([{ name: "saasweave_locale", value: "en", url: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000" }]);
    await page.goto(`/sign-in?redirect=${encodeURIComponent("/admin/")}`);
    await page.getByLabel("Email").fill(fixture.admin.email);
    await page.getByLabel("Password", { exact: true }).fill(fixture.admin.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.getByLabel("Authenticator code").fill(await generateTestTotpCode(fixture.admin.secret));
    await page.getByRole("button", { name: "Verify sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole("heading", { name: /platform dashboard/i })).toBeVisible();

    // Regression coverage: the canonical admin root must not fall through to
    // the console shell, including after a full document reload.
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/admin\/?$/);
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole("heading", { name: /platform dashboard/i })).toBeVisible();

    // The console entry point must resolve to the same canonical admin home.
    await page.goto("/app");
    const platformAdmin = page.locator('a[href$="/admin"], a[href$="/admin/"]').first();
    await expect(platformAdmin).toBeVisible();
    await platformAdmin.click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    const modules = [
      ["Users", "/admin/users"],
      ["Workspaces", "/admin/workspaces"],
      ["Projects", "/admin/projects"],
      ["Plans & catalog", "/admin/plans"],
      ["Subscriptions", "/admin/subscriptions"],
      ["Billing & usage", "/admin/billing"],
      ["Usage & credits", "/admin/usage"],
      ["Sessions", "/admin/sessions"],
      ["Audit log", "/admin/audit"],
      ["Security events", "/admin/security/events"],
      ["System health", "/admin/system/health"]
    ] as const;
    for (const [, path] of modules) {
      const link = page.locator(`a[href*="${path}"]`).first();
      if (await link.count()) await link.click();
      else await page.goto(path);
      await expect(page).not.toHaveURL(/404/);
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}\\/?$`));
      await page.goto("/admin/");
    }
  } finally {
    await fixture.dispose();
  }
});

test("unauthenticated visitors are sent to sign-in for the admin root", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page).toHaveURL(/\/sign-in\?redirect=.*admin/);
  await expect(page.getByRole("textbox").first()).toBeVisible();
});
