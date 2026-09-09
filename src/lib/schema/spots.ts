import { doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const spot = pgTable("spot", {
  id: text("id").primaryKey(),
  name: text("name"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const event = pgTable("event", {
  id: text("id").primaryKey(),
  spotId: text("spot_id")
    .notNull()
    .references(() => spot.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
