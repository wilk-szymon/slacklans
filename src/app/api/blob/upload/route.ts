import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { authorizeUpload, parseUploadKind } from "@/lib/blob-upload";
import { getSession } from "@/lib/session";

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function POST(request: Request) {
  if (!hasBlobToken()) {
    return NextResponse.json({ error: "Upload refused" }, { status: 400 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Upload refused" }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getSession();
        const decision = authorizeUpload(
          session?.user.id ?? null,
          parseUploadKind(clientPayload),
          pathname,
        );
        if (!decision.ok) {
          throw new Error("Upload refused");
        }
        return decision.options;
      },
      onUploadCompleted: async () => {
        // The photo row is written by the follow-up server action after head().
      },
    });
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Upload refused" }, { status: 400 });
  }
}
