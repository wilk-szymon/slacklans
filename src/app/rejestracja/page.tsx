import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackPath } from "@/lib/safe-callback-path";
import { RegisterForm } from "./RegisterForm";

export const metadata = {
  title: "Rejestracja — Slacklans",
};

export default async function RegisterPage({
  searchParams,
}: PageProps<"/rejestracja">) {
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
      <h1 className="text-2xl font-semibold tracking-tight">Zarejestruj się</h1>
      <RegisterForm callbackUrl={callbackUrl} />
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Masz już konto?{" "}
        <Link href="/logowanie" className="font-medium underline">
          Zaloguj się
        </Link>
      </p>
    </main>
  );
}
