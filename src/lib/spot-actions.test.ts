import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, getDb, insert, transaction } = vi.hoisted(() => {
  const insert = vi.fn();
  const transaction = vi.fn();
  return {
    getSession: vi.fn(),
    insert,
    transaction,
    getDb: vi.fn(() => ({
      insert,
      transaction,
      select: vi.fn(),
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

import { createSession } from "@/lib/spot-actions";

function sessionForm(fields: Record<string, string>): FormData {
  const data = new FormData();
  data.set("start", "2026-06-15T18:00");
  data.set("finish", "2026-06-15T20:00");
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

async function expectNoPersist(formData: FormData) {
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
    await expectNoPersist(
      sessionForm({ spotId: "00000000-0000-4000-8000-000000000001" }),
    );
  });

  it("does not insert when session is missing (new lat/lng shape)", async () => {
    await expectNoPersist(
      sessionForm({
        lat: "54.5189",
        lng: "18.5305",
        name: "Orłowo",
      }),
    );
  });
});
