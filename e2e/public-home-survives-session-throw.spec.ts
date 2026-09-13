// risk: test-plan.md #3 — session lookup throws and public `/` or
// `/sesja/[id]` 500 — visitors cannot see when/where
// seed: tests/seed.spec.ts
import { expect, test } from "@playwright/test";

test.describe("public chrome fail-open", () => {
  test("public home still shows visitor chrome when session lookup throws", async ({
    page,
  }) => {
    // Open `/` while session lookup is forced to throw (E2E_THROW_SESSION=1).
    const response = await page.goto("/");

    // The document stays up: visitor content, not a 500.
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Slacklans" }),
    ).toBeVisible();

    // Fail-open chrome is the logged-out header, not an error page.
    await expect(page.getByRole("link", { name: "Zaloguj się" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Zarejestruj się" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Wyloguj" })).toHaveCount(0);
  });
});
