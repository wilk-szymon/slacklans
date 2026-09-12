import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInEmail, signUpEmail, headersMock } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signInEmail,
      signUpEmail,
      signOut: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { login, register } from "@/lib/auth-actions";

const CANARY_PASSWORD = "canary-pw-9f3a2c1b-not-a-real-secret";
const CANARY_TOKEN = "canary-session-token-7e4d";
const CANARY_SECRET = "canary-better-auth-secret-zzzz";

function form(password: string, email = "walker@example.com"): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

function assertClean(result: unknown, password: string) {
  expect(result).toEqual({ error: expect.any(String) });
  const body = JSON.stringify(result);
  expect(body).not.toContain(password);
  expect(body).not.toContain(CANARY_TOKEN);
  expect(body).not.toContain(CANARY_SECRET);
  expect(body).not.toMatch(/USER_ALREADY_EXISTS/i);
  expect(body).not.toMatch(/user not found/i);
  expect(Object.keys(result as object)).toEqual(["error"]);
}

describe("login/register action bodies", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    signUpEmail.mockReset();
    headersMock.mockReset();
    headersMock.mockResolvedValue(
      new Headers({ "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}` }),
    );
    vi.stubEnv("BETTER_AUTH_SECRET", CANARY_SECRET);
  });

  it("does not echo a canary password when sign-in fails", async () => {
    signInEmail.mockRejectedValue(new Error("Invalid email or password"));
    const result = await login({}, form(CANARY_PASSWORD));
    assertClean(result, CANARY_PASSWORD);
    expect(signInEmail).toHaveBeenCalledOnce();
  });

  it("does not disclose USER_ALREADY_EXISTS from register", async () => {
    signUpEmail.mockRejectedValue({
      name: "APIError",
      status: "UNPROCESSABLE_ENTITY",
      body: {
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        message: "User already exists. Use another email.",
      },
    });
    const duplicate = await register({}, form(CANARY_PASSWORD));
    assertClean(duplicate, CANARY_PASSWORD);

    signUpEmail.mockRejectedValue({
      name: "APIError",
      status: "BAD_REQUEST",
      body: { code: "FAILED_TO_CREATE_USER", message: "nope" },
    });
    const generic = await register({}, form(CANARY_PASSWORD, "other@example.com"));
    assertClean(generic, CANARY_PASSWORD);
    expect(duplicate.error).toEqual(generic.error);
  });

  it("treats a short password as a distinct class without calling Better Auth", async () => {
    const short = await login({}, form("short"));
    expect(short).toEqual({ error: expect.any(String) });
    expect(signInEmail).not.toHaveBeenCalled();
    signInEmail.mockRejectedValue(new Error("nope"));
    const generic = await login({}, form(CANARY_PASSWORD));
    expect(generic).toEqual({ error: expect.any(String) });
    expect(short.error).not.toEqual(generic.error);
    expect(JSON.stringify(short)).not.toContain(CANARY_PASSWORD);
  });

  it("short-circuits login after 5 failures without calling Better Auth", async () => {
    headersMock.mockResolvedValue(
      new Headers({ "x-forwarded-for": "198.51.100.77" }),
    );
    signInEmail.mockRejectedValue(new Error("Invalid email or password"));
    for (let i = 0; i < 5; i += 1) {
      await login({}, form(CANARY_PASSWORD));
    }
    signInEmail.mockClear();
    const sixth = await login({}, form(CANARY_PASSWORD));
    expect(signInEmail).not.toHaveBeenCalled();
    assertClean(sixth, CANARY_PASSWORD);
  });
});
