CREATE TABLE "quran_push_schedule" (
	"id" text PRIMARY KEY DEFAULT uuidv7(),
	"subscription_id" text NOT NULL,
	"prayer" text NOT NULL,
	"send_at" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quran_push_subscriptions" (
	"id" text PRIMARY KEY DEFAULT uuidv7(),
	"endpoint" text NOT NULL UNIQUE,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "quran_push_schedule_send_at_idx" ON "quran_push_schedule" ("send_at");--> statement-breakpoint
CREATE INDEX "quran_push_schedule_subscription_idx" ON "quran_push_schedule" ("subscription_id","prayer");--> statement-breakpoint
ALTER TABLE "quran_push_schedule" ADD CONSTRAINT "quran_push_schedule_gNdarfDlKQ2I_fkey" FOREIGN KEY ("subscription_id") REFERENCES "quran_push_subscriptions"("id") ON DELETE CASCADE;