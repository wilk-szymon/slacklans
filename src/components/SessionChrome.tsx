import Link from "next/link";
import { logout } from "@/lib/auth-actions";
import { loadChromeSession } from "@/lib/chrome-session";

export async function SessionChrome() {
  const session = await loadChromeSession();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <Link href="/" className="flex min-h-12 items-center text-base font-semibold">
        Slacklans
      </Link>
      {session?.user ? (
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link
            href="/spot"
            className="flex min-h-12 items-center px-4 text-base font-medium"
          >
            Nowa sesja
          </Link>
          <Link
            href="/moje"
            className="flex min-h-12 items-center px-4 text-base font-medium"
          >
            Moje sesje
          </Link>
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
