import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("photo controls", () => {
  it("keeps session lookup off the public page files", () => {
    for (const file of [
      "src/app/sesja/[id]/page.tsx",
      "src/app/miejsce/[id]/page.tsx",
    ]) {
      const text = source(file);
      expect(text).not.toContain("getSession");
      expect(text).not.toContain("loadChromeSession");
      expect(text).not.toContain("upload(");
    }
    expect(source("src/app/sesja/[id]/page.tsx")).toContain("SessionPhotos");
    expect(source("src/app/miejsce/[id]/page.tsx")).toContain("SpotPhotos");
  });

  it("does not call loadChromeSession and upload() from the same file", () => {
    const files = [
      "src/app/sesja/[id]/page.tsx",
      "src/app/sesja/[id]/SessionPhotos.tsx",
      "src/app/sesja/[id]/SessionPhotoUpload.tsx",
      "src/app/miejsce/[id]/page.tsx",
      "src/app/miejsce/[id]/SpotPhotos.tsx",
      "src/app/miejsce/[id]/SpotPhotoUpload.tsx",
      "src/app/spot/SpotForm.tsx",
      "src/lib/upload-client-photo.ts",
    ];
    for (const file of files) {
      const text = source(file);
      expect(text.includes("loadChromeSession") && text.includes("upload(")).toBe(
        false,
      );
    }
    expect(source("src/app/sesja/[id]/SessionPhotos.tsx")).toContain(
      "loadChromeSession",
    );
    expect(source("src/app/miejsce/[id]/SpotPhotos.tsx")).toContain(
      "loadChromeSession",
    );
    expect(source("src/lib/upload-client-photo.ts")).toContain("upload(");
    expect(source("src/app/sesja/[id]/SessionPhotoUpload.tsx")).not.toContain(
      "loadChromeSession",
    );
    expect(source("src/app/miejsce/[id]/SpotPhotoUpload.tsx")).not.toContain(
      "loadChromeSession",
    );
  });

  it("submits uploaded urls and leaves the file out of the publish action", () => {
    const form = source("src/app/spot/SpotForm.tsx");
    expect(form).toContain('data.append("sessionPhotoUrl", url)');
    expect(form).toContain('data.append("spotPhotoUrl", url)');
    expect(form).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(form).toContain("Dodaj zdjęcie miejsca");
    expect(form).not.toContain('type="file" name=');
    expect(source("src/app/spot/page.tsx")).toContain("creatorId: spot.creatorId");
    expect(source("src/lib/spot-pin.ts")).toContain("creatorId: string");
  });
});
