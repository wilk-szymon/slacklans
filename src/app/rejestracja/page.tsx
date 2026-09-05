import Link from "next/link";
import { redirect } from "next/navigation";
import { safeCallbackPath } from "@/lib/safe-callback-path";
import { getSession } from "@/lib/session";
import { RegisterForm } from "./RegisterForm";

export const metadata = {
  title: "Rejestracja — Slacklans",
};

export default async function RegisterPage({
  searchParams,
}: PageProps<"/rejestracja">) {
  const session = await getSession();
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
