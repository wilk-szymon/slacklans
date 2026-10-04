import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
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

export const sessionPhoto = pgTable("session_photo", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => event.id, { onDelete: "restrict" }),
  uploaderId: text("uploader_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  blobUrl: text("blob_url").notNull(),
  pathname: text("pathname").notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const spotPhoto = pgTable("spot_photo", {
  id: text("id").primaryKey(),
  spotId: text("spot_id")
    .notNull()
    .references(() => spot.id, { onDelete: "restrict" }),
  uploaderId: text("uploader_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  blobUrl: text("blob_url").notNull(),
  pathname: text("pathname").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
