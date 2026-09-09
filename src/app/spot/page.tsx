import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { spot } from "@/lib/schema/spots";
import { getSession } from "@/lib/session";
import { SpotWorkspace } from "./SpotWorkspace";

export const metadata = {
  title: "Nowa sesja — Slacklans",
};

export default async function SpotPage() {
  const session = await getSession();
  if (!session) {
    redirect("/logowanie?callbackUrl=/spot");
  }

  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim() ?? "";
  const spots = await getDb()
    .select({
      id: spot.id,
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
    })
    .from(spot);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Nowa sesja</h1>
      <div className="mt-8">
        <SpotWorkspace spots={spots} maptilerKey={maptilerKey} />
      </div>
    </main>
  );
}
