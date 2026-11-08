import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { sessionPhoto, spotPhoto } from "@/lib/schema/spots";

function indexes(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes.map((index) => ({
    unique: index.config.unique,
    columns: index.config.columns.map((column) =>
      "name" in column ? column.name : "",
    ),
  }));
}

describe("photo table indexes", () => {
  it("session_photo has a unique pathname and an event_id index", () => {
    const found = indexes(sessionPhoto);
    expect(found).toContainEqual({ unique: true, columns: ["pathname"] });
    expect(found).toContainEqual({ unique: false, columns: ["event_id"] });
  });

  it("spot_photo has a unique pathname and a spot_id index", () => {
    const found = indexes(spotPhoto);
    expect(found).toContainEqual({ unique: true, columns: ["pathname"] });
    expect(found).toContainEqual({ unique: false, columns: ["spot_id"] });
  });
});
