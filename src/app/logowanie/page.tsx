import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/safe-callback-path";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Logowanie — Slacklans",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/logowanie">) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Zaloguj się</h1>
      <LoginForm callbackUrl={callbackUrl} />
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Nie masz konta?{" "}
        <Link href="/rejestracja" className="font-medium underline">
          Zarejestruj się
        </Link>
      </p>
    </main>
  );
}
