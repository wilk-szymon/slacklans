import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTH_DISABLED_PATHS } from "@/lib/auth-disabled-paths";

describe("AUTH_DISABLED_PATHS", () => {
  it("closes HTTP sign-up so it cannot enumerate emails", () => {
    expect(AUTH_DISABLED_PATHS).toContain("/sign-up/email");
  });

  it("is what Better Auth disabledPaths actually spreads", () => {
    const authSource = readFileSync(
      join(process.cwd(), "src/lib/auth.ts"),
      "utf8",
    );
    expect(authSource).toContain("disabledPaths: [...AUTH_DISABLED_PATHS]");
  });
});
