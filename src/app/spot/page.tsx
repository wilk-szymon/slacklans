import { redirect } from "next/navigation";
import { SpotMapLoader } from "@/components/SpotMapLoader";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Nowa sesja — Slacklans",
};

export default async function SpotPage() {
  const session = await getSession();
  if (!session) {
    redirect("/logowanie?callbackUrl=/spot");
  }

  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim() ?? "";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Nowa sesja</h1>
      <div className="mt-8">
        <SpotMapLoader maptilerKey={maptilerKey} />
      </div>
    </main>
  );
}
