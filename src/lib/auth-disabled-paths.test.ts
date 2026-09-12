import { describe, expect, it } from "vitest";
import { AUTH_DISABLED_PATHS } from "@/lib/auth-disabled-paths";

describe("AUTH_DISABLED_PATHS", () => {
  it("closes HTTP sign-up so it cannot enumerate emails", () => {
    expect(AUTH_DISABLED_PATHS).toContain("/sign-up/email");
  });
});
