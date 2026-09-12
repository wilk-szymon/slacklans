import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("public pages stay session-free", () => {
  it("src/app/page.tsx does not contain getSession", () => {
    expect(source("src/app/page.tsx")).not.toContain("getSession");
  });

  it("src/app/sesja/[id]/page.tsx does not contain getSession", () => {
    expect(source("src/app/sesja/[id]/page.tsx")).not.toContain("getSession");
  });

  it("src/app/layout.tsx does not call getSession and still mounts SessionChrome", () => {
    const layout = source("src/app/layout.tsx");
    expect(layout).not.toContain("getSession");
    expect(layout).toContain("SessionChrome");
  });
});
