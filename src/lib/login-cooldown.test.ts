import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLoginFailures,
  isInCooldown,
  recordLoginFailure,
} from "@/lib/login-cooldown";

describe("login-cooldown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not cooling down before 5 failures in the window", () => {
    const key = "cooldown-under-5";
    for (let i = 0; i < 4; i += 1) {
      recordLoginFailure(key);
    }
    expect(isInCooldown(key)).toBe(false);
    recordLoginFailure(key);
    expect(isInCooldown(key)).toBe(true);
    clearLoginFailures(key);
  });

  it("clears after 30s", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const key = "cooldown-window";
    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure(key);
    }
    expect(isInCooldown(key)).toBe(true);
    vi.setSystemTime(new Date("2026-01-01T00:00:30Z"));
    expect(isInCooldown(key)).toBe(false);
  });
});
