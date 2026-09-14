import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { event } from "@/lib/schema/spots";
import { getSession } from "@/lib/session";
import { formatWarsawLocal } from "@/lib/warsaw-time";
import { EditSessionForm } from "./EditSessionForm";

function Forbidden({ message }: { message: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Brak dostępu</h1>
      <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
        {message}
      </p>
    </main>
  );
}

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();
  const session = await getSession();
  if (!session) {
    redirect(`/logowanie?callbackUrl=/sesja/${id}/edytuj`);
  }

  const [row] = await getDb()
    .select({
      creatorId: event.creatorId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    })
    .from(event)
    .where(eq(event.id, id))
    .limit(1);

  if (!row) {
    notFound();
  }
  if (row.creatorId !== session.user.id) {
    return <Forbidden message="Nie możesz edytować tej sesji." />;
  }
  if (row.endsAt.getTime() <= new Date().getTime()) {
    return <Forbidden message="Tej sesji nie można już zmienić." />;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Edytuj sesję</h1>
      <EditSessionForm
        eventId={id}
        start={formatWarsawLocal(row.startsAt)}
        finish={formatWarsawLocal(row.endsAt)}
      />
    </main>
  );
}
