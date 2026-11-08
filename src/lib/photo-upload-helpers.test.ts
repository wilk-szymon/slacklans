import { describe, expect, it } from "vitest";
import {
  finishAfterStartError,
  photoCacheKey,
  partialSaveMessage,
} from "@/lib/photo-upload-helpers";

function file(name: string, size: number, lastModified: number): File {
  return new File([new Uint8Array(size)], name, { lastModified });
}

describe("photoCacheKey", () => {
  it("differs by kind, name, size and lastModified", () => {
    const base = photoCacheKey("session", file("a.jpg", 3, 1));
    expect(photoCacheKey("session", file("a.jpg", 3, 1))).toBe(base);
    expect(photoCacheKey("spot", file("a.jpg", 3, 1))).not.toBe(base);
    expect(photoCacheKey("session", file("b.jpg", 3, 1))).not.toBe(base);
    expect(photoCacheKey("session", file("a.jpg", 4, 1))).not.toBe(base);
    expect(photoCacheKey("session", file("a.jpg", 3, 2))).not.toBe(base);
  });
});

describe("partialSaveMessage", () => {
  it("returns the error unchanged when nothing was saved", () => {
    expect(partialSaveMessage(0, 3, "Błąd")).toBe("Błąd");
  });

  it("prefixes how many photos were saved", () => {
    expect(partialSaveMessage(2, 3, "Błąd")).toBe("Zapisano 2 z 3 zdjęć. Błąd");
  });
});

describe("finishAfterStartError", () => {
  it("flags finish not after start", () => {
    expect(finishAfterStartError("2026-06-01T10:00", "2026-06-01T10:00")).toBe(
      "Zakończenie musi być później niż start.",
    );
    expect(
      finishAfterStartError("2026-06-01T10:00", "2026-06-01T09:00"),
    ).not.toBeNull();
  });

  it("accepts a later finish and defers unparsable values to the server", () => {
    expect(
      finishAfterStartError("2026-06-01T10:00", "2026-06-01T11:00"),
    ).toBeNull();
    expect(finishAfterStartError("", "")).toBeNull();
  });
});
