import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const route = readFileSync(
  join(process.cwd(), "src/app/api/auth/[...all]/route.ts"),
  "utf8",
);

describe("auth catch-all wraps JSON through the secret stripper", () => {
  it("GET and POST call withStrippedAuthJson", () => {
    expect(route).toContain("withStrippedAuthJson");
    expect(route).toMatch(/GET[\s\S]*withStrippedAuthJson/);
    expect(route).toMatch(/POST[\s\S]*withStrippedAuthJson/);
    expect(route).not.toMatch(
      /export const \{ GET, POST \} = toNextJsHandler/,
    );
  });
});
