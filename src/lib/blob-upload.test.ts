import { describe, expect, it } from "vitest";
import {
  authorizeUpload,
  MAX_PHOTO_BYTES,
  parseUploadKind,
  PHOTO_CONTENT_TYPES,
  PHOTO_SIZE_ERROR,
  PHOTO_TYPE_ERROR,
  photoFileError,
  photoListError,
  photoUploadPathname,
} from "@/lib/blob-upload";

const USER = "user-1";

describe("photoFileError", () => {
  it("accepts jpeg, png, and webp inside the size limit", () => {
    expect(photoFileError({ type: "image/jpeg", size: 100, name: "a.jpg" })).toBeNull();
    expect(photoFileError({ type: "image/png", size: MAX_PHOTO_BYTES, name: "a.png" })).toBeNull();
    expect(photoFileError({ type: "", size: 10, name: "a.webp" })).toBeNull();
  });

  it("refuses HEIC, other types, and oversize files", () => {
    expect(photoFileError({ type: "image/heic", size: 100, name: "a.heic" })).toBe(
      PHOTO_TYPE_ERROR,
    );
    expect(photoFileError({ type: "", size: 100, name: "a.HEIC" })).toBe(
      PHOTO_TYPE_ERROR,
    );
    expect(photoFileError({ type: "image/jpeg", size: 100, name: "a.heic" })).toBe(
      PHOTO_TYPE_ERROR,
    );
    expect(photoFileError({ type: "image/gif", size: 10, name: "a.gif" })).toBe(
      PHOTO_TYPE_ERROR,
    );
    expect(
      photoFileError({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1, name: "a.jpg" }),
    ).toBe(PHOTO_SIZE_ERROR);
    expect(
      photoListError([
        { type: "image/jpeg", size: 10, name: "ok.jpg" },
        { type: "image/heic", size: 10, name: "no.heic" },
      ]),
    ).toBe(PHOTO_TYPE_ERROR);
  });
});

describe("photoUploadPathname", () => {
  it("keeps the file under the caller's kind prefix", () => {
    expect(photoUploadPathname("session", "user-1", "a.jpg")).toBe(
      "session-photos/user-1/a.jpg",
    );
    expect(photoUploadPathname("spot", "user-1", "my photo.png")).toBe(
      "spot-photos/user-1/myphoto.png",
    );
    expect(photoUploadPathname("session", "user-1", "../secret.jpg")).toBe(
      "session-photos/user-1/secret.jpg",
    );
    expect(photoUploadPathname("session", "user-1", "..\\secret.jpg")).not.toContain(
      "..",
    );
  });
});

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
