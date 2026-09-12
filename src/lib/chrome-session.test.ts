import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));

import { loadChromeSession } from "@/lib/chrome-session";

describe("loadChromeSession", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("returns null when getSession rejects", async () => {
    getSession.mockRejectedValue(new Error("FAILED_TO_GET_SESSION"));
    await expect(loadChromeSession()).resolves.toBeNull();
  });

  it("returns the session when getSession resolves", async () => {
    const session = { user: { email: "a@b.c" } };
    getSession.mockResolvedValue(session);
    await expect(loadChromeSession()).resolves.toBe(session);
  });
});

describe("SessionChrome source", () => {
  it("does not call getSession directly", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/SessionChrome.tsx"),
      "utf8",
    );
    expect(source).toContain("loadChromeSession");
    expect(source).not.toContain("getSession");
  });
});
