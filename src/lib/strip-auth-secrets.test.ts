import { describe, expect, it } from "vitest";
import {
  stripAuthSecrets,
  withStrippedAuthJson,
} from "@/lib/strip-auth-secrets";

const CANARY_PASSWORD = "canary-pw-9f3a2c1b-not-a-real-secret";
const CANARY_TOKEN = "canary-session-token-7e4d";

describe("stripAuthSecrets", () => {
  it("removes a top-level sign-in token and keeps unrelated fields", () => {
    const input = {
      redirect: false,
      token: CANARY_TOKEN,
      user: { email: "a@b.c" },
    };
    expect(stripAuthSecrets(input)).toEqual({
      redirect: false,
      user: { email: "a@b.c" },
    });
    expect(input.token).toBe(CANARY_TOKEN);
  });

  it("removes token keys inside arrays (list-sessions shape)", () => {
    const input = [
      { token: CANARY_TOKEN, id: "s1" },
      { token: CANARY_TOKEN, id: "s2" },
    ];
    expect(stripAuthSecrets(input)).toEqual([{ id: "s1" }, { id: "s2" }]);
    expect(JSON.stringify(stripAuthSecrets(input))).not.toContain(CANARY_TOKEN);
    expect(input[0]?.token).toBe(CANARY_TOKEN);
  });

  it("removes nested session.token", () => {
    const input = {
      session: { token: CANARY_TOKEN, expiresAt: "soon" },
      user: { id: "u1" },
    };
    expect(stripAuthSecrets(input)).toEqual({
      session: { expiresAt: "soon" },
      user: { id: "u1" },
    });
  });

  it("removes a canary password string when provided", () => {
    const input = { error: "x", password: CANARY_PASSWORD, ok: true };
    expect(stripAuthSecrets(input, CANARY_PASSWORD)).toEqual({
      error: "x",
      ok: true,
    });
    expect(JSON.stringify(stripAuthSecrets(input, CANARY_PASSWORD))).not.toContain(
      CANARY_PASSWORD,
    );
  });

  it("passes through null and non-JSON primitives", () => {
    expect(stripAuthSecrets(null)).toBeNull();
    expect(stripAuthSecrets(42)).toBe(42);
    expect(stripAuthSecrets("hello")).toBe("hello");
  });
});

describe("withStrippedAuthJson", () => {
  it("strips JSON token and preserves Set-Cookie", async () => {
    const headers = new Headers({
      "content-type": "application/json",
    });
    headers.append(
      "Set-Cookie",
      "better-auth.session_token=cookie-value; HttpOnly; Path=/",
    );
    const inner = new Response(
      JSON.stringify({ token: CANARY_TOKEN, user: { email: "a@b.c" } }),
      { status: 200, headers },
    );
    const out = await withStrippedAuthJson(inner);
    const body = await out.json();
    expect(body).toEqual({ user: { email: "a@b.c" } });
    expect(JSON.stringify(body)).not.toContain(CANARY_TOKEN);
    const cookies =
      typeof out.headers.getSetCookie === "function"
        ? out.headers.getSetCookie()
        : [out.headers.get("set-cookie")];
    expect(cookies.join(";")).toContain("better-auth.session_token=cookie-value");
    expect(cookies.join(";")).toMatch(/HttpOnly/i);
  });

  it("leaves non-JSON bodies unchanged", async () => {
    const inner = new Response("not-json", {
      status: 404,
      headers: { "content-type": "text/plain" },
    });
    const out = await withStrippedAuthJson(inner);
    expect(await out.text()).toBe("not-json");
    expect(out.status).toBe(404);
  });
});
