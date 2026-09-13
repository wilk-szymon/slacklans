import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  if (process.env["E2E_THROW_SESSION"] === "1") {
    throw new Error("E2E_THROW_SESSION");
  }
  return auth.api.getSession({
    headers: await headers(),
  });
});
