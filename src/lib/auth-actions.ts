"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  clearLoginFailures,
  cooldownKey,
  isInCooldown,
  recordLoginFailure,
} from "@/lib/login-cooldown";
import { safeCallbackPath } from "@/lib/safe-callback-path";

export type AuthFormState = {
  error?: string;
};

const LOGIN_ERROR = "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.";
const REGISTER_ERROR =
  "Nie udało się utworzyć konta. Sprawdź dane i spróbuj ponownie.";
const COOLDOWN_ERROR = "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
const PASSWORD_LENGTH_ERROR = "Hasło musi mieć co najmniej 8 znaków.";

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

function passwordFromForm(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function polishAuthError(error: unknown, kind: "login" | "register"): string {
  if (isAPIError(error)) {
    if (error.statusCode === 429 || error.status === "TOO_MANY_REQUESTS") {
      return COOLDOWN_ERROR;
    }
    const code =
      error.body &&
      typeof error.body === "object" &&
      "code" in error.body &&
      typeof error.body.code === "string"
        ? error.body.code
        : "";
    if (code === "PASSWORD_TOO_SHORT") {
      return PASSWORD_LENGTH_ERROR;
    }
  }
  return kind === "login" ? LOGIN_ERROR : REGISTER_ERROR;
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = passwordFromForm(formData.get("password"));
  const callbackUrl = safeCallbackPath(formData.get("callbackUrl"));
  const headerList = await headers();
  const key = cooldownKey(headerList);

  if (isInCooldown(key)) {
    return { error: COOLDOWN_ERROR };
  }

  if (password.length < 8) {
    recordLoginFailure(key);
    return { error: PASSWORD_LENGTH_ERROR };
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: headerList,
    });
  } catch (error) {
    recordLoginFailure(key);
    return { error: polishAuthError(error, "login") };
  }

  clearLoginFailures(key);
  redirect(callbackUrl);
}

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = passwordFromForm(formData.get("password"));
  const callbackUrl = safeCallbackPath(formData.get("callbackUrl"));

  if (password.length < 8) {
    return { error: PASSWORD_LENGTH_ERROR };
  }

  const name = email.split("@")[0] || "slackliner";

  try {
    await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
    });
  } catch (error) {
    return { error: polishAuthError(error, "register") };
  }

  redirect(callbackUrl);
}

export async function logout(): Promise<void> {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
}
