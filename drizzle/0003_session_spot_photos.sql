CREATE TABLE "session_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"uploader_id" text NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spot_photo" (
	"id" text PRIMARY KEY NOT NULL,
	"spot_id" text NOT NULL,
	"uploader_id" text NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_photo" ADD CONSTRAINT "session_photo_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_photo" ADD CONSTRAINT "session_photo_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spot_photo" ADD CONSTRAINT "spot_photo_spot_id_spot_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spot"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spot_photo" ADD CONSTRAINT "spot_photo_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;