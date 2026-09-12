const TOKEN_KEY = "token";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stripAuthSecrets(
  payload: unknown,
  canaryPassword?: string,
): unknown {
  if (payload === null || typeof payload === "undefined") {
    return payload;
  }
  if (typeof payload === "string") {
    if (canaryPassword && payload === canaryPassword) {
      return undefined;
    }
    return payload;
  }
  if (typeof payload !== "object") {
    return payload;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => stripAuthSecrets(item, canaryPassword));
  }
  if (!isPlainObject(payload)) {
    return payload;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === TOKEN_KEY) {
      continue;
    }
    const next = stripAuthSecrets(value, canaryPassword);
    if (
      typeof next === "undefined" &&
      canaryPassword &&
      value === canaryPassword
    ) {
      continue;
    }
    out[key] = next;
  }
  return out;
}

function copyResponseHeaders(from: Headers): Headers {
  const to = new Headers();
  const setCookies =
    typeof from.getSetCookie === "function" ? from.getSetCookie() : [];
  from.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      return;
    }
    to.append(key, value);
  });
  for (const cookie of setCookies) {
    to.append("Set-Cookie", cookie);
  }
  return to;
}

export async function withStrippedAuthJson(
  response: Response,
): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return response;
  }

  const text = await response.text();
  const headers = copyResponseHeaders(response.headers);
  if (text.trim() === "") {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const body = JSON.stringify(stripAuthSecrets(parsed));
  headers.set("content-length", String(new TextEncoder().encode(body).length));
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
