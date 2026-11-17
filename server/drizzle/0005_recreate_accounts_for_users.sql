-- The first version of accounts held its own email and held no real data. Credentials now belong to a user:
-- the profile (email, names, nickname) lives in users and the email is the username.
-- Recreating the table drops its updated_at trigger, so it is created again below.
DROP TABLE "accounts";--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_password_hash_not_empty" CHECK (char_length("accounts"."password_hash") > 0)
);--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
