import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, getDb, handleUpload } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getDb: vi.fn(),
  handleUpload: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession }));
vi.mock("@/lib/db", () => ({ getDb }));
vi.mock("@vercel/blob/client", () => ({ handleUpload }));

import { POST } from "@/app/api/blob/upload/route";

const ORIGINAL = process.env.BLOB_READ_WRITE_TOKEN;
const TOKEN = "test-blob-token";

function request(body: string): Request {
  return new Request("http://localhost/api/blob/upload", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/blob/upload", () => {
  beforeEach(() => {
    getSession.mockReset();
    getDb.mockClear();
    handleUpload.mockReset();
    process.env.BLOB_READ_WRITE_TOKEN = TOKEN;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = ORIGINAL;
    }
  });

  it("refuses the upload when the token is missing", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const response = await POST(request("{}"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Upload refused" });
    expect(handleUpload).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("refuses a logged-out token request", async () => {
    getSession.mockResolvedValue(null);
    handleUpload.mockImplementation(
      async (options: {
        onBeforeGenerateToken: (
          pathname: string,
          clientPayload: string | null,
          multipart: boolean,
        ) => Promise<unknown>;
      }) => {
        await options.onBeforeGenerateToken(
          "session-photos/user-1/a.jpg",
          JSON.stringify({ kind: "session" }),
          false,
        );
        return { type: "blob.generate-client-token", clientToken: "client" };
      },
    );

    const response = await POST(request("{}"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Upload refused" });
    expect(getDb).not.toHaveBeenCalled();
  });

  it("issues token options without a pathname and does not insert a row", async () => {
    getSession.mockResolvedValue({ user: { id: "user-1" } });
    let captured: Record<string, unknown> | undefined;
    handleUpload.mockImplementation(
      async (options: {
        onBeforeGenerateToken: (
          pathname: string,
          clientPayload: string | null,
          multipart: boolean,
        ) => Promise<Record<string, unknown>>;
        onUploadCompleted?: () => Promise<void>;
      }) => {
        captured = await options.onBeforeGenerateToken(
          "session-photos/user-1/a.jpg",
          JSON.stringify({ kind: "session" }),
          false,
        );
        await options.onUploadCompleted?.();
        return { type: "blob.generate-client-token", clientToken: "client" };
      },
    );

    const response = await POST(request("{}"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      type: "blob.generate-client-token",
      clientToken: "client",
    });
    expect(JSON.stringify(body)).not.toContain(TOKEN);
    expect(captured).not.toHaveProperty("pathname");
    expect(captured?.allowedContentTypes).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(getDb).not.toHaveBeenCalled();
  });
});
