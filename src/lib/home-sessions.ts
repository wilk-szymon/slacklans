import { count, eq, gt, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { event, spot } from "@/lib/schema/spots";

export type HomeSession = {
  id: string;
  creatorId: string;
  startsAt: Date;
  endsAt: Date;
  name: string | null;
  lat: number;
  lng: number;
};

export type RankedHomeSessions = {
  hero: HomeSession | null;
  rest: HomeSession[];
};

export function rankHomeSessions(
  rows: readonly HomeSession[],
  finishedCountByCreator: Readonly<Record<string, number>>,
  now: Date,
): RankedHomeSessions {
  const nowMs = now.getTime();
  const eligible = rows.filter((row) => row.endsAt.getTime() > nowMs);
  eligible.sort((a, b) => {
    const startDiff = a.startsAt.getTime() - b.startsAt.getTime();
    if (startDiff !== 0) {
      return startDiff;
    }
    const countA = finishedCountByCreator[a.creatorId] ?? 0;
    const countB = finishedCountByCreator[b.creatorId] ?? 0;
    if (countA !== countB) {
      return countB - countA;
    }
    if (a.id < b.id) {
      return -1;
    }
    if (a.id > b.id) {
      return 1;
    }
    return 0;
  });
  const [hero, ...rest] = eligible;
  return { hero: hero ?? null, rest };
}

export async function loadHomeSessions(
  now: Date,
): Promise<RankedHomeSessions> {
  const db = getDb();
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: event.id,
        creatorId: event.creatorId,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        name: spot.name,
        lat: spot.lat,
        lng: spot.lng,
      })
      .from(event)
      .innerJoin(spot, eq(event.spotId, spot.id))
      .where(gt(event.endsAt, now)),
    db
      .select({
        creatorId: event.creatorId,
        n: count(),
      })
      .from(event)
      .where(lte(event.endsAt, now))
      .groupBy(event.creatorId),
  ]);

  const finishedCountByCreator: Record<string, number> = {};
  for (const row of counts) {
    finishedCountByCreator[row.creatorId] = Number(row.n);
  }

  return rankHomeSessions(rows, finishedCountByCreator, now);
}
