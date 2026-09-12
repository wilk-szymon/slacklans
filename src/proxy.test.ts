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

function isLoginRedirect(response: Response): boolean {
  const location = response.headers.get("location") ?? "";
  return (
    location.includes("/logowanie") && location.includes("callbackUrl=%2Fspot")
  );
}

describe("proxy cookie presence", () => {
  it("redirects /spot to login when there is no cookie", () => {
    const response = proxy(request("/spot"));
    expect(isLoginRedirect(response)).toBe(true);
  });

  it("lets a garbage session cookie through /spot", () => {
    const response = proxy(
      request("/spot", "better-auth.session_token=garbage"),
    );
    expect(isLoginRedirect(response)).toBe(false);
  });

  it("does not cookie-gate paths other than /spot", () => {
    const response = proxy(request("/"));
    expect(isLoginRedirect(response)).toBe(false);
  });
});
