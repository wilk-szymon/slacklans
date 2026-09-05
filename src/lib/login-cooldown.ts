const WINDOW_MS = 30_000;
const MAX_FAILURES = 5;

type Bucket = {
  count: number;
  windowStart: number;
};

const failures = new Map<string, Bucket>();

export function cooldownKey(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headerList.get("x-real-ip") ?? "local";
}

export function isInCooldown(key: string): boolean {
  const now = Date.now();
  const bucket = failures.get(key);
  if (!bucket) {
    return false;
  }
  if (now - bucket.windowStart >= WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return bucket.count >= MAX_FAILURES;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const bucket = failures.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    failures.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
