import { describe, expect, it } from "vitest";
import {
  authorizeUpload,
  MAX_PHOTO_BYTES,
  parseUploadKind,
  PHOTO_CONTENT_TYPES,
} from "@/lib/blob-upload";

const USER = "user-1";

describe("parseUploadKind", () => {
  it("reads session and spot kinds", () => {
    expect(parseUploadKind(JSON.stringify({ kind: "session" }))).toBe("session");
    expect(parseUploadKind(JSON.stringify({ kind: "spot" }))).toBe("spot");
  });

  it("rejects missing, malformed, and unknown kinds", () => {
    expect(parseUploadKind(null)).toBeNull();
    expect(parseUploadKind("")).toBeNull();
    expect(parseUploadKind("session")).toBeNull();
    expect(parseUploadKind(JSON.stringify({ kind: "heic" }))).toBeNull();
    expect(parseUploadKind(JSON.stringify(["session"]))).toBeNull();
  });
});

describe("authorizeUpload", () => {
  it("rejects a missing user or kind", () => {
    expect(
      authorizeUpload(null, "session", `session-photos/${USER}/a.jpg`),
    ).toEqual({ ok: false });
    expect(
      authorizeUpload(USER, null, `session-photos/${USER}/a.jpg`),
    ).toEqual({ ok: false });
  });

  it("rejects a pathname outside the caller's prefix", () => {
    expect(
      authorizeUpload(USER, "session", `spot-photos/${USER}/a.jpg`),
    ).toEqual({ ok: false });
    expect(
      authorizeUpload(USER, "spot", `session-photos/${USER}/a.jpg`),
    ).toEqual({ ok: false });
    expect(
      authorizeUpload(USER, "session", "session-photos/user-2/a.jpg"),
    ).toEqual({ ok: false });
  });

  it("rejects path traversal", () => {
    expect(
      authorizeUpload(USER, "session", `session-photos/${USER}/../user-2/a.jpg`),
    ).toEqual({ ok: false });
    expect(
      authorizeUpload(USER, "session", `session-photos\\${USER}\\a.jpg`),
    ).toEqual({ ok: false });
  });

  it("returns type and size limits and does not choose the pathname", () => {
    const decision = authorizeUpload(
      USER,
      "session",
      `session-photos/${USER}/a.jpg`,
    );

    expect(decision.ok).toBe(true);
    if (!decision.ok) {
      return;
    }
    expect(decision.options).not.toHaveProperty("pathname");
    expect(decision.options.allowedContentTypes).toEqual([
      ...PHOTO_CONTENT_TYPES,
    ]);
    expect(decision.options.allowedContentTypes).not.toContain("image/heic");
    expect(decision.options.allowedContentTypes).not.toContain("image/gif");
    expect(decision.options.maximumSizeInBytes).toBe(MAX_PHOTO_BYTES);
    expect(decision.options.maximumSizeInBytes).toBe(8 * 1024 * 1024);
    expect(decision.options.addRandomSuffix).toBe(true);
    expect(JSON.parse(decision.options.tokenPayload)).toEqual({
      userId: USER,
      kind: "session",
    });
  });

  it("uses the spot prefix for a spot upload", () => {
    const decision = authorizeUpload(USER, "spot", `spot-photos/${USER}/a.webp`);

    expect(decision.ok).toBe(true);
    if (!decision.ok) {
      return;
    }
    expect(JSON.parse(decision.options.tokenPayload)).toEqual({
      userId: USER,
      kind: "spot",
    });
    expect(decision.options).not.toHaveProperty("pathname");
  });
});
