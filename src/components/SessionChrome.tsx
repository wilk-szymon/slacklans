import Link from "next/link";
import { logout } from "@/lib/auth-actions";
import { getSession } from "@/lib/session";

export async function SessionChrome() {
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <Link href="/" className="flex min-h-12 items-center text-base font-semibold">
        Slacklans
      </Link>
      {session?.user ? (
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-sm">{session.user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-12 items-center rounded-full border border-black/[.08] px-4 text-base font-medium dark:border-white/[.145]"
            >
              Wyloguj
            </button>
          </form>
        </div>
      ) : (
        <nav className="flex items-center gap-2">
          <Link
            href="/logowanie"
            className="flex min-h-12 items-center px-4 text-base font-medium"
          >
            Zaloguj się
          </Link>
          <Link
            href="/rejestracja"
            className="flex min-h-12 items-center rounded-full bg-foreground px-4 text-base font-medium text-background"
          >
            Zarejestruj się
          </Link>
        </nav>
      )}
    </header>
  );
}
