import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  getDb,
  insert,
  values,
  transaction,
  update,
  set,
  del,
  limit,
  blobHead,
  blobDel,
} = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const joinSpot = vi.fn(() => ({ where, innerJoin: joinNext }));
  function joinNext() {
    return { where, innerJoin: joinNext };
  }
  const select = vi.fn(() => ({ from: vi.fn(() => ({ where, innerJoin: joinSpot })) }));
  const values = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values }));
  const updateWhere = vi.fn(async () => undefined);
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));
  const del = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
  const transaction = vi.fn();
  return {
    getSession: vi.fn(),
    insert,
    values,
    transaction,
    update,
    set,
    del,
    limit,
    blobHead: vi.fn(),
    blobDel: vi.fn(),
    getDb: vi.fn(() => ({
      insert,
      select,
      update,
      delete: del,
      transaction,
    })),
  };
});

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ getDb }));
vi.mock("@vercel/blob", () => ({ head: blobHead, del: blobDel }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({
  refresh: vi.fn(),
}));

import {
  addSessionPhoto,
  addSpotPhoto,
  deleteSessionPhoto,
  deleteSpotPhoto,
  featureSessionPhoto,
  unfeatureSessionPhoto,
} from "@/lib/photo-actions";

const USER = { user: { id: "user-1" } };
const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const SPOT_ID = "22222222-2222-4222-8222-222222222222";
const SESSION_URL =
  "https://example.public.blob.vercel-storage.com/session-photos/user-1/a.jpg";
const SPOT_URL =
  "https://example.public.blob.vercel-storage.com/spot-photos/user-1/b.png";

function ownedHead(pathname: string, contentType = "image/jpeg", size = 100) {
  return {
    url: `https://example.public.blob.vercel-storage.com/${pathname}`,
    pathname,
    contentType,
    size,
  };
}

describe("photo actions", () => {
  beforeEach(() => {
    getSession.mockReset();
    getDb.mockClear();
    insert.mockClear();
    values.mockClear();
    transaction.mockReset();
    update.mockClear();
    set.mockClear();
    del.mockClear();
    limit.mockReset();
    blobHead.mockReset();
    blobDel.mockReset();
    getSession.mockResolvedValue(USER);
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        select: getDb().select,
        insert,
        update,
        delete: del,
      }),
    );
  });

  it("redirects to login and writes nothing when the session is missing", async () => {
    getSession.mockResolvedValue(null);
    const actions = [
      () => addSessionPhoto(EVENT_ID, SESSION_URL),
      () => deleteSessionPhoto("photo-1"),
      () => addSpotPhoto(SPOT_ID, SPOT_URL),
      () => deleteSpotPhoto("photo-2"),
      () => featureSessionPhoto("photo-3"),
      () => unfeatureSessionPhoto("photo-4"),
    ];

    for (const action of actions) {
      await expect(action()).rejects.toThrow(
        /NEXT_REDIRECT:\/logowanie\?callbackUrl=/,
      );
    }
    expect(getDb).not.toHaveBeenCalled();
    expect(blobHead).not.toHaveBeenCalled();
    expect(blobDel).not.toHaveBeenCalled();
  });

  it("writes nothing when head() fails", async () => {
    blobHead.mockRejectedValue(new Error("missing"));

    const result = await addSessionPhoto(EVENT_ID, SESSION_URL);

    expect(result.error).toBeDefined();
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    [
      "another user's pathname",
      ownedHead("session-photos/user-2/a.jpg"),
    ],
    ["a disallowed type", ownedHead("session-photos/user-1/a.jpg", "image/heic")],
    [
      "a file over 8 MiB",
      ownedHead("session-photos/user-1/a.jpg", "image/jpeg", 8 * 1024 * 1024 + 1),
    ],
    ["the wrong kind", ownedHead("spot-photos/user-1/a.jpg")],
  ])("writes nothing for %s", async (_label, meta) => {
    blobHead.mockResolvedValue(meta);

    const result = await addSessionPhoto(EVENT_ID, SESSION_URL);

    expect(result.error).toBeDefined();
    expect(insert).not.toHaveBeenCalled();
  });

  it("writes nothing for a non-https url", async () => {
    const result = await addSessionPhoto(EVENT_ID, "http://example.test/a.jpg");

    expect(result.error).toBeDefined();
    expect(blobHead).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts a photo on a session that has already ended", async () => {
    blobHead.mockResolvedValue(ownedHead("session-photos/user-1/a.jpg"));
    limit.mockResolvedValue([
      { id: EVENT_ID, endsAt: new Date(Date.now() - 60_000) },
    ]);

    const result = await addSessionPhoto(EVENT_ID, SESSION_URL);

    expect(result.error).toBeUndefined();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: EVENT_ID,
        uploaderId: "user-1",
        featured: false,
        pathname: "session-photos/user-1/a.jpg",
      }),
    );
  });

  it("does not insert a spot photo for a non-owner", async () => {
    limit.mockResolvedValue([{ creatorId: "user-2" }]);

    const result = await addSpotPhoto(SPOT_ID, SPOT_URL);

    expect(result.error).toBeDefined();
    expect(insert).not.toHaveBeenCalled();
    expect(blobHead).not.toHaveBeenCalled();
  });

  it("does not delete another user's session photo", async () => {
    limit.mockResolvedValue([
      {
        pathname: "session-photos/user-2/a.jpg",
        uploaderId: "user-2",
        featured: true,
      },
    ]);

    const result = await deleteSessionPhoto("photo-1");

    expect(result.error).toBeDefined();
    expect(del).not.toHaveBeenCalled();
    expect(blobDel).not.toHaveBeenCalled();
  });

  it("deletes a featured photo the author uploaded", async () => {
    limit.mockResolvedValue([
      {
        pathname: "session-photos/user-1/a.jpg",
        uploaderId: "user-1",
        featured: true,
      },
    ]);

    const result = await deleteSessionPhoto("photo-1");

    expect(result.error).toBeUndefined();
    expect(del).toHaveBeenCalled();
    expect(blobDel).toHaveBeenCalledWith(["session-photos/user-1/a.jpg"]);
  });

  it("does not delete a spot photo for a non-owner", async () => {
    limit.mockResolvedValue([
      { creatorId: "user-2", pathname: "spot-photos/user-2/a.jpg" },
    ]);

    const result = await deleteSpotPhoto("photo-1");

    expect(result.error).toBeDefined();
    expect(del).not.toHaveBeenCalled();
    expect(blobDel).not.toHaveBeenCalled();
  });

  it("does not feature a photo from a spot the user does not own", async () => {
    limit.mockResolvedValue([{ creatorId: "user-2" }]);

    const result = await featureSessionPhoto("photo-1");

    expect(result.error).toBeDefined();
    expect(update).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("unfeatures a photo without deleting it", async () => {
    limit.mockResolvedValue([{ creatorId: "user-1" }]);

    const result = await unfeatureSessionPhoto("photo-1");

    expect(result.error).toBeUndefined();
    expect(set).toHaveBeenCalledWith({ featured: false });
    expect(del).not.toHaveBeenCalled();
    expect(blobDel).not.toHaveBeenCalled();
  });
});
