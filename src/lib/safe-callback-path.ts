const SAME_ORIGIN = "https://slacklans.invalid";
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;
const ENCODED_PATH_SEPARATOR_PATTERN = /%2[fF]|%5[cC]/;

function hasControlCharacters(value: string): boolean {
  if (CONTROL_CHARACTER_PATTERN.test(value)) {
    return true;
  }
  try {
    return CONTROL_CHARACTER_PATTERN.test(decodeURIComponent(value));
  } catch {
    return true;
  }
}

export function safeCallbackPath(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length === 0) {
    return "/";
  }
  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    hasControlCharacters(raw)
  ) {
    return "/";
  }
  const pathEnd = raw.search(/[?#]/);
  const path = pathEnd === -1 ? raw : raw.slice(0, pathEnd);
  if (ENCODED_PATH_SEPARATOR_PATTERN.test(path)) {
    return "/";
  }
  try {
    const parsed = new URL(raw, SAME_ORIGIN);
    if (parsed.origin !== new URL(SAME_ORIGIN).origin) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
