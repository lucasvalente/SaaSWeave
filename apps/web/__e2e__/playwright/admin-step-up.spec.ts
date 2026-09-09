import { expect, type Page, test } from "@playwright/test";
import { generate } from "otplib";

import { createStepUpFixture, type StepUpFixture } from "./step-up.fixture";

let fixture: StepUpFixture;

async function currentCode(secret: string): Promise<string> {
  return generate({ algorithm: "sha1", digits: 6, period: 30, secret });
}

async function signInWithMfa(page: Page, admin: StepUpFixture["admin"], redirect = "/admin") {
  await page.goto(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel(/e-?\s*mail/i).fill(admin.email);
  await page.getByLabel(/password|senha/i).fill(admin.password);
  await page.getByRole("button", { name: /sign in|entrar/i }).click();
  await page.getByLabel(/authenticator code|código do autenticador/i).fill(await currentCode(admin.secret));
  const verificationResponse = page.waitForResponse((response) =>
    response.url().includes("/two-factor/verify-totp")
  );
  await page.getByRole("button", { name: /verify sign in|verificar entrada|confirmar entrada/i }).click();
  expect((await verificationResponse).ok()).toBe(true);

  // Verify only non-sensitive cookie metadata. The value is intentionally never read or logged.
  const sessionCookieMetadata = (await page.context().cookies())
    .filter((cookie) => cookie.name.includes("session"))
    .map(({ domain, httpOnly, name, path, sameSite, secure }) => {
      return {
        domain,
        httpOnly,
        name,
        path,
        sameSite,
        secure
      };
    });
  expect(sessionCookieMetadata.some((cookie) => cookie.path === "/")).toBe(true);

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const response = await fetch("http://localhost:5000/server/auth/get-session", {
          credentials: "include"
        });
        if (!response.ok) return false;
        const data = (await response.json()) as { user?: { id?: string } };
        return Boolean(data.user?.id);
      })
    )
    .toBe(true);

  await expect(page).toHaveURL(new RegExp(redirect.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

test.describe("admin step-up MFA", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeAll(async () => {
    fixture = await createStepUpFixture();
  });
  test.afterAll(async () => {
    await fixture?.dispose();
  });

  test("logs in with Better Auth MFA and applies a privileged role exactly once after step-up", async ({
    page
  }) => {
    const target = await fixture.createTarget();
    let roleMutationRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes("setRoles")) roleMutationRequests += 1;
    });
    await signInWithMfa(page, fixture.admin);
    await page.goto("/admin/users");
    await page.getByLabel("Search users").fill(target.email);
    await page.getByRole("button", { name: `Grant platform admin to ${target.email}` }).click();
    await expect(page.getByRole("heading", { name: "Confirm your identity" })).toBeVisible();
    await page.getByLabel("Authenticator code").fill(await currentCode(fixture.admin.secret));
    await page.getByRole("button", { name: "Confirm identity" }).click();
    await expect(page.getByText(target.email, { exact: false })).toContainText("platform_admin");
    expect(roleMutationRequests).toBe(2);
    await expect(page.locator("body")).not.toContainText(fixture.admin.secret);
  });

  test("does not apply a privileged role after an invalid step-up code", async ({ page }) => {
    const target = await fixture.createTarget();
    await signInWithMfa(page, fixture.admin);
    await page.goto("/admin/users");
    await page.getByLabel("Search users").fill(target.email);
    await page.getByRole("button", { name: `Grant platform admin to ${target.email}` }).click();
    await page.getByLabel("Authenticator code").fill("000000");
    await page.getByRole("button", { name: "Confirm identity" }).click();
    await expect(page.getByRole("heading", { name: "Confirm your identity" })).toBeVisible();
    await expect(page.getByText(/no platform role/)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(fixture.admin.secret);
  });

  test("keeps an invalid MFA login out of admin routes", async ({ page }) => {
    await page.goto("/sign-in?redirect=%2Fadmin");
    await page.getByLabel("Email").fill(fixture.admin.email);
    await page.getByLabel("Password", { exact: true }).fill(fixture.admin.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.getByLabel("Authenticator code").fill("000000");
    await page.getByRole("button", { name: "Verify sign in" }).click();
    await expect(page.getByLabel("Authenticator code")).toBeVisible();
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test("returns to an internal redirect after MFA", async ({ page }) => {
    await signInWithMfa(page, fixture.admin, "/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  for (const unsafeRedirect of ["https://evil.invalid", "//evil.invalid", "javascript:alert(1)"]) {
    test(`blocks unsafe redirect ${unsafeRedirect}`, async ({ page }) => {
      await page.goto(`/sign-in?redirect=${encodeURIComponent(unsafeRedirect)}`);
      await page.getByLabel("Email").fill(fixture.admin.email);
      await page.getByLabel("Password", { exact: true }).fill(fixture.admin.password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.getByLabel("Authenticator code").fill(await currentCode(fixture.admin.secret));
      const verificationResponse = page.waitForResponse((response) =>
        response.url().includes("/two-factor/verify-totp")
      );
      await page.getByRole("button", { name: "Verify sign in" }).click();
      expect((await verificationResponse).ok()).toBe(true);
      await expect(page).toHaveURL(/^http:\/\/localhost:13000\/(?:admin|app|$)/);
    });
  }

  test("rejects an untrusted origin", async ({ request }) => {
    const response = await request.post("http://localhost:5000/server/auth/sign-in/email", {
      headers: { Origin: "http://evil.invalid" },
      data: { email: fixture.admin.email, password: fixture.admin.password }
    });
    expect(response.status()).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_ORIGIN" });
  });

  test("keeps a finite Better Auth login rate limit", async ({ request }) => {
    let response;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await request.post("http://localhost:5000/server/auth/sign-in/email", {
        headers: { Origin: "http://localhost:13000" },
        data: { email: fixture.admin.email, password: "invalid-password" }
      });
      if (response.status() === 429) break;
    }

    expect(response?.status()).toBe(429);
    expect(response?.headers()["x-retry-after"] ?? response?.headers()["retry-after"]).toMatch(
      /^\d+$/
    );
  });
});
