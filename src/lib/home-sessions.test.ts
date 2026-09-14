import { describe, expect, it } from "vitest";
import {
  rankHomeSessions,
  type HomeSession,
} from "@/lib/home-sessions";

const NOW = new Date("2026-09-14T16:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function session(
  overrides: Partial<HomeSession> & Pick<HomeSession, "id">,
): HomeSession {
  return {
    creatorId: "host-a",
    startsAt: new Date(NOW.getTime() + HOUR),
    endsAt: new Date(NOW.getTime() + 2 * HOUR),
    name: "Orłowo",
    lat: 54.48,
    lng: 18.55,
    ...overrides,
  };
}

describe("rankHomeSessions", () => {
  it("makes an in-progress session the hero over a later future start", () => {
    const live = session({
      id: "live",
      startsAt: new Date(NOW.getTime() - 30 * 60 * 1000),
      endsAt: new Date(NOW.getTime() + 30 * 60 * 1000),
    });
    const later = session({
      id: "later",
      startsAt: new Date(NOW.getTime() + 10 * 60 * 1000),
      endsAt: new Date(NOW.getTime() + HOUR),
    });

    const ranked = rankHomeSessions([later, live], {}, NOW);

    expect(ranked.hero?.id).toBe("live");
    expect(ranked.rest.map((row) => row.id)).toEqual(["later"]);
  });

  it("drops finished rows", () => {
    const finished = session({
      id: "done",
      startsAt: new Date(NOW.getTime() - 2 * HOUR),
      endsAt: new Date(NOW.getTime() - HOUR),
    });
    const upcoming = session({ id: "next" });

    const ranked = rankHomeSessions([finished, upcoming], {}, NOW);

    expect(ranked.hero?.id).toBe("next");
    expect(ranked.rest).toEqual([]);
  });

  it("drops a session that ends exactly now", () => {
    const endingNow = session({
      id: "ending",
      startsAt: new Date(NOW.getTime() - HOUR),
      endsAt: NOW,
    });

    expect(rankHomeSessions([endingNow], {}, NOW)).toEqual({
      hero: null,
      rest: [],
    });
  });

  it("returns an empty hero and rest for empty input", () => {
    expect(rankHomeSessions([], {}, NOW)).toEqual({ hero: null, rest: [] });
  });

  it("picks the host with more finished sessions on a start tie", () => {
    const start = new Date(NOW.getTime() + HOUR);
    const veteran = session({
      id: "veteran-session",
      creatorId: "veteran",
      startsAt: start,
    });
    const newcomer = session({
      id: "newcomer-session",
      creatorId: "newcomer",
      startsAt: start,
    });

    const ranked = rankHomeSessions(
      [newcomer, veteran],
      { veteran: 3, newcomer: 0 },
      NOW,
    );

    expect(ranked.hero?.id).toBe("veteran-session");
    expect(ranked.rest.map((row) => row.id)).toEqual(["newcomer-session"]);
  });

  it("treats a missing finished-count key as zero", () => {
    const start = new Date(NOW.getTime() + HOUR);
    const counted = session({
      id: "counted",
      creatorId: "has-history",
      startsAt: start,
    });
    const missing = session({
      id: "missing",
      creatorId: "no-history",
      startsAt: start,
    });

    const ranked = rankHomeSessions(
      [missing, counted],
      { "has-history": 1 },
      NOW,
    );

    expect(ranked.hero?.id).toBe("counted");
  });

  it("picks the smaller id when start and finished count match", () => {
    const start = new Date(NOW.getTime() + HOUR);
    const b = session({ id: "bbb", creatorId: "host-b", startsAt: start });
    const a = session({ id: "aaa", creatorId: "host-a", startsAt: start });

    const ranked = rankHomeSessions(
      [b, a],
      { "host-a": 1, "host-b": 1 },
      NOW,
    );

    expect(ranked.hero?.id).toBe("aaa");
    expect(ranked.rest.map((row) => row.id)).toEqual(["bbb"]);
  });

  it("keeps the remaining rows in the same order as the hero rule", () => {
    const live = session({
      id: "live",
      startsAt: new Date(NOW.getTime() - 10 * 60 * 1000),
      endsAt: new Date(NOW.getTime() + HOUR),
    });
    const mid = session({
      id: "mid",
      startsAt: new Date(NOW.getTime() + HOUR),
    });
    const last = session({
      id: "last",
      startsAt: new Date(NOW.getTime() + 2 * HOUR),
    });

    const ranked = rankHomeSessions([last, live, mid], {}, NOW);

    expect(ranked.hero?.id).toBe("live");
    expect(ranked.rest.map((row) => row.id)).toEqual(["mid", "last"]);
  });
});
