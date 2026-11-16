CREATE TABLE "auth_rate_limits" (
	"id" text PRIMARY KEY DEFAULT uuidv7(),
	"key" text NOT NULL UNIQUE,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
