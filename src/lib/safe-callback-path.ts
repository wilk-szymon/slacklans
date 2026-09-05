export function safeCallbackPath(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length === 0) {
    return "/";
  }
  if (!raw.startsWith("/")) {
    return "/";
  }
  if (raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  if (raw.includes("://") || raw.includes("\\")) {
    return "/";
  }
  return raw;
}
