import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Nowe — Slacklans",
};

export default async function NowePage() {
  const session = await getSession();
  if (!session) {
    redirect("/logowanie?callbackUrl=/nowe");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Wkrótce</h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Dodawanie spotów i sesji pojawi się wkrótce.
      </p>
    </main>
  );
}
