CREATE UNIQUE INDEX "session_photo_pathname_unique" ON "session_photo" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "session_photo_event_id_idx" ON "session_photo" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spot_photo_pathname_unique" ON "spot_photo" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "spot_photo_spot_id_idx" ON "spot_photo" USING btree ("spot_id");