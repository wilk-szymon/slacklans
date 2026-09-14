import { describe, expect, it } from "vitest";
import { formatWarsawLocal, parseWarsawLocal } from "@/lib/warsaw-time";

describe("formatWarsawLocal", () => {
  it("round-trips a Warsaw datetime-local value", () => {
    const raw = "2026-06-15T18:00";
    const parsed = parseWarsawLocal(raw);
    expect(parsed).not.toBeNull();
    expect(formatWarsawLocal(parsed!)).toBe(raw);
  });

  it("does not use UTC ISO for the input value", () => {
    const parsed = parseWarsawLocal("2026-06-15T18:00");
    expect(parsed).not.toBeNull();
    expect(parsed!.toISOString().slice(0, 16)).toBe("2026-06-15T16:00");
    expect(formatWarsawLocal(parsed!)).toBe("2026-06-15T18:00");
  });
});
