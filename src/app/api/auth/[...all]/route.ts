import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { withStrippedAuthJson } from "@/lib/strip-auth-secrets";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  return withStrippedAuthJson(await handler.GET(request));
}

export async function POST(request: Request) {
  return withStrippedAuthJson(await handler.POST(request));
}
