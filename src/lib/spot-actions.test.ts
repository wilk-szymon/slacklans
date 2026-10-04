import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  getDb,
  insert,
  transaction,
  update,
  set,
  del,
  limit,
  countWhere,
  blobHead,
  blobDel,
} = vi.hoisted(() => {
  const insert = vi.fn();
  const limit = vi.fn();
  const innerWhere = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where: innerWhere }));
  const countWhere = vi.fn();
  const from = vi.fn(() => ({
    innerJoin,
    where: countWhere,
  }));
  const select = vi.fn(() => ({ from }));
  const set = vi.fn(() => ({
    where: vi.fn(() => Promise.resolve()),
  }));
  const update = vi.fn(() => ({ set }));
  const deleteWhere = vi.fn(() => Promise.resolve());
  const del = vi.fn<(table: unknown) => { where: typeof deleteWhere }>();
  del.mockReturnValue({ where: deleteWhere });
  const transaction = vi.fn();
  return {
    getSession: vi.fn(),
    insert,
    transaction,
    update,
    set,
    del,
    limit,
    countWhere,
    blobHead: vi.fn(),
    blobDel: vi.fn(),
    getDb: vi.fn(() => ({
      insert,
      transaction,
      select,
      update,
      delete: del,
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

import { event, sessionPhoto, spot, spotPhoto } from "@/lib/schema/spots";
import {
  createSession,
  deleteSession,
  updateSession,
} from "@/lib/spot-actions";

const USER = { user: { id: "user-1" } };
const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const SPOT_ID = "22222222-2222-4222-8222-222222222222";
const HOUR = 60 * 60 * 1000;

function sessionForm(fields: Record<string, string>): FormData {
  const data = new FormData();
  data.set("start", "2026-06-15T18:00");
  data.set("finish", "2026-06-15T20:00");
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

function editForm(fields: Record<string, string> = {}): FormData {
  return sessionForm({ eventId: EVENT_ID, ...fields });
}

function editableRow(
  overrides: Partial<{
    creatorId: string;
    endsAt: Date;
    spotCreatorId: string;
  }> = {},
) {
  const now = Date.now();
  return {
    id: EVENT_ID,
    spotId: SPOT_ID,
    creatorId: "user-1",
    startsAt: new Date(now + HOUR),
    endsAt: new Date(now + 2 * HOUR),
    spotCreatorId: "user-1",
    ...overrides,
  };
}

async function expectNoCreatePersist(formData: FormData) {
  await expect(createSession({}, formData)).rejects.toThrow(/NEXT_REDIRECT/);
  expect(insert).not.toHaveBeenCalled();
  expect(transaction).not.toHaveBeenCalled();
  expect(getDb).not.toHaveBeenCalled();
}

describe("createSession write gate", () => {
  beforeEach(() => {
    getSession.mockReset();
    getDb.mockClear();
    insert.mockReset();
    transaction.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("does not insert when session is missing (existing spotId shape)", async () => {
    await expectNoCreatePersist(
      sessionForm({ spotId: "00000000-0000-4000-8000-000000000001" }),
    );
  });

  it("does not insert when session is missing (new lat/lng shape)", async () => {
    await expectNoCreatePersist(
      sessionForm({
        lat: "54.5189",
        lng: "18.5305",
        name: "Orłowo",
      }),
    );
  });
});

const SESSION_BLOB =
  "https://example.public.blob.vercel-storage.com/session-photos/user-1/a.jpg";
const OTHER_SESSION_BLOB =
  "https://example.public.blob.vercel-storage.com/session-photos/user-2/a.jpg";
const SPOT_BLOB =
  "https://example.public.blob.vercel-storage.com/spot-photos/user-1/b.png";

function headResult(pathname: string, contentType: string) {
  return {
    url: `https://example.public.blob.vercel-storage.com/${pathname}`,
    pathname,
    contentType,
    size: 128,
  };
}

describe("createSession photos", () => {
  beforeEach(() => {
    getSession.mockReset();
    getDb.mockClear();
    insert.mockReset();
    transaction.mockReset();
    countWhere.mockReset();
    blobHead.mockReset();
    blobDel.mockReset();
    getSession.mockResolvedValue(USER);
  });

  it("does not insert when a non-owner submits a spot photo url", async () => {
    countWhere.mockResolvedValue([{ id: SPOT_ID, creatorId: "user-2" }]);
    const data = sessionForm({ spotId: SPOT_ID });
    data.append("spotPhotoUrl", SPOT_BLOB);

    const result = await createSession({}, data);

    expect(result.error).toBeDefined();
    expect(transaction).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    expect(blobHead).not.toHaveBeenCalled();
  });

  it("does not insert when one session photo url belongs to another user", async () => {
    countWhere.mockResolvedValue([{ id: SPOT_ID, creatorId: "user-1" }]);
    blobHead.mockImplementation(async (url: string) => {
      if (url === OTHER_SESSION_BLOB) {
        return headResult("session-photos/user-2/a.jpg", "image/jpeg");
      }
      return headResult("session-photos/user-1/a.jpg", "image/jpeg");
    });
    const data = sessionForm({ spotId: SPOT_ID });
    data.append("sessionPhotoUrl", SESSION_BLOB);
    data.append("sessionPhotoUrl", OTHER_SESSION_BLOB);

    const result = await createSession({}, data);

    expect(result.error).toBeDefined();
    expect(transaction).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts the event and verified photos in one transaction", async () => {
    countWhere.mockResolvedValue([{ id: SPOT_ID, creatorId: "user-1" }]);
    blobHead.mockImplementation(async (url: string) => {
      if (url === SPOT_BLOB) {
        return headResult("spot-photos/user-1/b.png", "image/png");
      }
      return headResult("session-photos/user-1/a.jpg", "image/jpeg");
    });
    const values = vi.fn(async () => undefined);
    insert.mockReturnValue({ values });
    transaction.mockImplementation(
      async (fn: (tx: { insert: typeof insert }) => Promise<void>) => {
        await fn({ insert });
      },
    );
    const data = sessionForm({ spotId: SPOT_ID });
    data.append("sessionPhotoUrl", SESSION_BLOB);
    data.append("spotPhotoUrl", SPOT_BLOB);

    await expect(createSession({}, data)).rejects.toThrow(
      /NEXT_REDIRECT:\/sesja\//,
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(3);
    expect(values).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ spotId: SPOT_ID, creatorId: "user-1" }),
    );
    expect(values).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        uploaderId: "user-1",
        featured: false,
        pathname: "session-photos/user-1/a.jpg",
      }),
    );
    expect(values).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        spotId: SPOT_ID,
        uploaderId: "user-1",
        pathname: "spot-photos/user-1/b.png",
      }),
    );
    expect(insert.mock.calls.map((call) => call[0])).toEqual([
      event,
      sessionPhoto,
      spotPhoto,
    ]);
  });
});

describe("updateSession write gate", () => {
  beforeEach(() => {
    getSession.mockReset();
    getDb.mockClear();
    update.mockClear();
    set.mockClear();
    limit.mockReset();
    getSession.mockResolvedValue(null);
  });

  it("does not update when session is missing", async () => {
    await expect(updateSession({}, editForm())).rejects.toThrow(
      /NEXT_REDIRECT:\/logowanie\?callbackUrl=\/sesja\/.*\/edytuj/,
    );
    expect(getDb).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not update when another user owns the event", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow({ creatorId: "user-2" })]);

    const result = await updateSession({}, editForm());

    expect(result.error).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not update when the session has already ended", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([
      editableRow({ endsAt: new Date(Date.now() - HOUR) }),
    ]);

    const result = await updateSession({}, editForm());

    expect(result.error).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("updates times for the creator of a not-finished session", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow()]);

    await expect(updateSession({}, editForm())).rejects.toThrow(
      `NEXT_REDIRECT:/sesja/${EVENT_ID}`,
    );
    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalled();
  });
});

describe("deleteSession write gate", () => {
  beforeEach(() => {
    getSession.mockReset();
    getDb.mockClear();
    del.mockClear();
    limit.mockReset();
    countWhere.mockReset();
    blobDel.mockReset();
    transaction.mockReset();
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({ delete: del, select: getDb().select }),
    );
    getSession.mockResolvedValue(null);
  });

  it("does not delete when session is missing", async () => {
    await expect(deleteSession({}, editForm())).rejects.toThrow(
      /NEXT_REDIRECT:\/logowanie/,
    );
    expect(getDb).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("does not delete when another user owns the event", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow({ creatorId: "user-2" })]);

    const result = await deleteSession({}, editForm());

    expect(result.error).toBeDefined();
    expect(transaction).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("does not delete when the session has already ended", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([
      editableRow({ endsAt: new Date(Date.now() - HOUR) }),
    ]);

    const result = await deleteSession({}, editForm());

    expect(result.error).toBeDefined();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("deletes the event for the creator of a not-finished session", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow()]);
    countWhere.mockResolvedValueOnce([]).mockResolvedValueOnce([{ n: 1 }]);

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(transaction).toHaveBeenCalled();
    expect(del.mock.calls.map((call) => call[0])).toEqual([sessionPhoto, event]);
    expect(blobDel).not.toHaveBeenCalled();
  });

  it("also deletes an unused pin the creator owns", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow({ spotCreatorId: "user-1" })]);
    countWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ n: 0 }])
      .mockResolvedValueOnce([]);

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(del.mock.calls.map((call) => call[0])).toEqual([
      sessionPhoto,
      event,
      spotPhoto,
      spot,
    ]);
    expect(blobDel).not.toHaveBeenCalled();
  });

  it("does not delete someone else's pin when it becomes empty", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow({ spotCreatorId: "user-2" })]);
    countWhere.mockResolvedValueOnce([]).mockResolvedValueOnce([{ n: 0 }]);

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(del.mock.calls.map((call) => call[0])).toEqual([sessionPhoto, event]);
    expect(blobDel).not.toHaveBeenCalled();
  });

  it("removes photo rows before the event and deletes blobs after commit", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow()]);
    countWhere
      .mockResolvedValueOnce([{ pathname: "session-photos/user-1/a.jpg" }])
      .mockResolvedValueOnce([{ n: 0 }])
      .mockResolvedValueOnce([{ pathname: "spot-photos/user-1/b.jpg" }]);

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(del.mock.calls.map((call) => call[0])).toEqual([
      sessionPhoto,
      event,
      spotPhoto,
      spot,
    ]);
    expect(blobDel).toHaveBeenCalledWith([
      "session-photos/user-1/a.jpg",
      "spot-photos/user-1/b.jpg",
    ]);
    expect(blobDel.mock.invocationCallOrder[0]).toBeGreaterThan(
      transaction.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("still leaves the session deleted when the blob delete fails", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow()]);
    countWhere
      .mockResolvedValueOnce([{ pathname: "session-photos/user-1/a.jpg" }])
      .mockResolvedValueOnce([{ n: 1 }]);
    blobDel.mockRejectedValue(new Error("blob down"));

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(del.mock.calls.map((call) => call[0])).toEqual([sessionPhoto, event]);
  });
});
