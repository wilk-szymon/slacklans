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
  const del = vi.fn(() => ({ where: deleteWhere }));
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
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

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
    countWhere.mockResolvedValue([{ n: 1 }]);

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(transaction).toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });

  it("also deletes an unused pin the creator owns", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow({ spotCreatorId: "user-1" })]);
    countWhere.mockResolvedValue([{ n: 0 }]);

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(del).toHaveBeenCalledTimes(2);
  });

  it("does not delete someone else's pin when it becomes empty", async () => {
    getSession.mockResolvedValue(USER);
    limit.mockResolvedValue([editableRow({ spotCreatorId: "user-2" })]);
    countWhere.mockResolvedValue([{ n: 0 }]);

    await expect(deleteSession({}, editForm())).rejects.toThrow(
      "NEXT_REDIRECT:/moje",
    );
    expect(del).toHaveBeenCalledTimes(1);
  });
});
