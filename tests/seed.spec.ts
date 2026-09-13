// risk: test-plan.md #2 — a logged-out visitor, or a request with a cookie
// but no live session, can persist a spot or event
// seed: tests/seed.spec.ts
import { expect, test } from "@playwright/test";

test.describe("logged-out write gate", () => {
  test("logged-out visitor is sent to login instead of the new-session form", async ({
    page,
  }) => {
    // Open the persist URL with no session cookie.
    await page.goto("/spot");

    // Fail closed: login, with a same-origin return path.
    await expect(page).toHaveURL(/\/logowanie/);
    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Hasło")).toBeVisible();

    // The create form must not render for a logged-out visitor.
    await expect(
      page.getByRole("heading", { name: "Nowa sesja" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Opublikuj sesję" }),
    ).toHaveCount(0);
  });
});
