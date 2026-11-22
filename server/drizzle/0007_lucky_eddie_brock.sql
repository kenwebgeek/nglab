ALTER TABLE "users" ADD COLUMN "admin" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "admin" = true WHERE "email" = 'kenreynolds78@icloud.com';