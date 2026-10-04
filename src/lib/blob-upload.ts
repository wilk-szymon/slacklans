export const PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PHOTO_SAVE_ERROR = "Nie można zapisać zdjęcia.";
export const PHOTO_TYPE_ERROR = "Dozwolone są tylko pliki JPEG, PNG i WebP.";
export const PHOTO_SIZE_ERROR = "Plik jest za duży. Maksymalny rozmiar to 8 MB.";

const BLOCKED_EXTENSIONS = new Set(["heic", "heif", "gif", "svg"]);

export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export type PhotoKind = "session" | "spot";

export type UploadTokenOptions = {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
  addRandomSuffix: true;
  tokenPayload: string;
};

export function photoPathPrefix(kind: PhotoKind, userId: string): string {
  const root = kind === "session" ? "session-photos" : "spot-photos";
  return `${root}/${userId}/`;
}

export function photoExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) {
    return "";
  }
  return base.slice(dot + 1).toLowerCase();
}

function safePhotoName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/\.\.+/g, ".")
    .replace(/^\.+/, "");
  if (cleaned.length === 0 || cleaned === "." || cleaned.includes("..")) {
    return "photo";
  }
  return cleaned.slice(0, 80);
}

export function photoUploadPathname(
  kind: PhotoKind,
  userId: string,
  fileName: string,
): string {
  return `${photoPathPrefix(kind, userId)}${safePhotoName(fileName)}`;
}

export function resolvedPhotoType(file: {
  type: string;
  name: string;
}): PhotoContentType | null {
  if (BLOCKED_EXTENSIONS.has(photoExtension(file.name))) {
    return null;
  }
  if (isPhotoContentType(file.type)) {
    return file.type;
  }
  if (file.type !== "") {
    return null;
  }
  const ext = photoExtension(file.name);
  if (ext === "jpg" || ext === "jpeg") {
    return "image/jpeg";
  }
  if (ext === "png") {
    return "image/png";
  }
  if (ext === "webp") {
    return "image/webp";
  }
  return null;
}

export function photoFileError(file: {
  type: string;
  size: number;
  name: string;
}): string | null {
  if (!resolvedPhotoType(file)) {
    return PHOTO_TYPE_ERROR;
  }
  if (!Number.isFinite(file.size) || file.size < 0 || file.size > MAX_PHOTO_BYTES) {
    return PHOTO_SIZE_ERROR;
  }
  return null;
}

export function photoListError(
  files: readonly { type: string; size: number; name: string }[],
): string | null {
  for (const file of files) {
    const problem = photoFileError(file);
    if (problem) {
      return problem;
    }
  }
  return null;
}

export function parseUploadKind(clientPayload: string | null): PhotoKind | null {
  if (!clientPayload) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(clientPayload);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const kind = (parsed as { kind?: unknown }).kind;
    if (kind === "session" || kind === "spot") {
      return kind;
    }
  } catch {
    return null;
  }
  return null;
}

function isSafeUserId(userId: string): boolean {
  return (
    userId.length > 0 &&
    !userId.includes("/") &&
    !userId.includes("\\") &&
    !userId.includes("..") &&
    !userId.includes("\0")
  );
}

export function isAllowedPhotoPath(
  kind: PhotoKind,
  userId: string,
  pathname: string,
): boolean {
  if (!isSafeUserId(userId)) {
    return false;
  }
  if (
    pathname.includes("..") ||
    pathname.includes("\\") ||
    pathname.includes("\0")
  ) {
    return false;
  }
  return pathname.startsWith(photoPathPrefix(kind, userId));
}

export function isPhotoContentType(value: string): value is PhotoContentType {
  return (PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * Token options for a browser upload.
 * Do not return `pathname`: the SDK overwrites it. The browser must send a
 * pathname that already starts with this user's prefix.
 */
export function authorizeUpload(
  userId: string | null,
  kind: PhotoKind | null,
  pathname: string,
): { ok: true; options: UploadTokenOptions } | { ok: false } {
  if (!userId || !kind || !isAllowedPhotoPath(kind, userId, pathname)) {
    return { ok: false };
  }
  return {
    ok: true,
    options: {
      allowedContentTypes: [...PHOTO_CONTENT_TYPES],
      maximumSizeInBytes: MAX_PHOTO_BYTES,
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({ userId, kind }),
    },
  };
}
