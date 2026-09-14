import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

function isLoginRedirect(response: Response, callbackPath: string): boolean {
  const location = response.headers.get("location") ?? "";
  const encoded = encodeURIComponent(callbackPath);
  return location.includes("/logowanie") && location.includes(`callbackUrl=${encoded}`);
}

describe("proxy cookie presence", () => {
  it("redirects /spot to login when there is no cookie", () => {
    const response = proxy(request("/spot"));
    expect(isLoginRedirect(response, "/spot")).toBe(true);
  });

  it("redirects /moje to login when there is no cookie", () => {
    const response = proxy(request("/moje"));
    expect(isLoginRedirect(response, "/moje")).toBe(true);
  });

  it("lets a garbage session cookie through /spot", () => {
    const response = proxy(
      request("/spot", "better-auth.session_token=garbage"),
    );
    expect(isLoginRedirect(response, "/spot")).toBe(false);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not cookie-gate /sesja paths", () => {
    const response = proxy(
      request("/sesja/11111111-1111-4111-8111-111111111111"),
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not cookie-gate /", () => {
    const response = proxy(request("/"));
    expect(response.headers.get("location")).toBeNull();
  });
});
