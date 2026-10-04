import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb, select, from, where, innerJoin, orderBy } = vi.hoisted(() => {
  const orderBy = vi.fn();
  const where = vi.fn(() => ({ orderBy }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ where, innerJoin }));
  const select = vi.fn(() => ({ from }));
  return {
    orderBy,
    where,
    innerJoin,
    from,
    select,
    getDb: vi.fn(() => ({ select })),
  };
});

vi.mock("@/lib/db", () => ({ getDb }));

import {
  loadSessionPhotos,
  loadSpotGallery,
  loadUnfeaturedSessionPhotos,
  mergeGallery,
} from "@/lib/photo-queries";

const EARLY = new Date("2026-01-01T00:00:00Z");
const LATER = new Date("2026-02-01T00:00:00Z");

describe("mergeGallery", () => {
  it("keeps spot and session rows as different kinds, ordered by time then id", () => {
    const gallery = mergeGallery(
      [
        { id: "b", blobUrl: "spot-b", createdAt: EARLY },
        { id: "a", blobUrl: "spot-a", createdAt: EARLY },
      ],
      [{ id: "c", blobUrl: "session-c", createdAt: LATER }],
    );

    expect(gallery).toEqual([
      { id: "a", blobUrl: "spot-a", createdAt: EARLY, kind: "spot" },
      { id: "b", blobUrl: "spot-b", createdAt: EARLY, kind: "spot" },
      { id: "c", blobUrl: "session-c", createdAt: LATER, kind: "session" },
    ]);
  });
});

describe("photo list queries", () => {
  beforeEach(() => {
    getDb.mockClear();
    select.mockClear();
    from.mockClear();
    where.mockClear();
    innerJoin.mockClear();
    orderBy.mockReset();
  });

  it("returns the session list without gallery rows", async () => {
    const rows = [
      {
        id: "photo-1",
        blobUrl: "https://example.test/a.jpg",
        uploaderId: "user-1",
        createdAt: EARLY,
      },
    ];
    orderBy.mockResolvedValue(rows);

    await expect(loadSessionPhotos("event-1")).resolves.toEqual(rows);
    expect(innerJoin).not.toHaveBeenCalled();
  });

  it("returns the gallery from separate spot and featured-session queries", async () => {
    orderBy
      .mockResolvedValueOnce([
        { id: "spot-1", blobUrl: "https://example.test/spot.jpg", createdAt: LATER },
      ])
      .mockResolvedValueOnce([
        {
          id: "session-1",
          blobUrl: "https://example.test/session.jpg",
          createdAt: EARLY,
        },
      ]);

    await expect(loadSpotGallery("spot-1")).resolves.toEqual([
      {
        id: "session-1",
        blobUrl: "https://example.test/session.jpg",
        createdAt: EARLY,
        kind: "session",
      },
      {
        id: "spot-1",
        blobUrl: "https://example.test/spot.jpg",
        createdAt: LATER,
        kind: "spot",
      },
    ]);
    expect(select).toHaveBeenCalledTimes(2);
    expect(innerJoin).toHaveBeenCalledTimes(1);
  });

  it("returns unfeatured session photos as id and url only", async () => {
    const rows = [{ id: "photo-2", blobUrl: "https://example.test/b.jpg" }];
    orderBy.mockResolvedValue(rows);

    await expect(loadUnfeaturedSessionPhotos("spot-1")).resolves.toEqual(rows);
    expect(innerJoin).toHaveBeenCalledTimes(1);
  });
});
