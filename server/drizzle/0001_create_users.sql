CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"nickname" text,
	"email" "citext" NOT NULL,
	"current_activity" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_first_name_length" CHECK (char_length(btrim("users"."first_name")) between 2 and 100),
	CONSTRAINT "users_last_name_length" CHECK (char_length(btrim("users"."last_name")) between 2 and 100),
	CONSTRAINT "users_nickname_length" CHECK (char_length(btrim("users"."nickname")) between 1 and 100),
	CONSTRAINT "users_current_activity_length" CHECK (char_length(btrim("users"."current_activity")) between 1 and 200),
	CONSTRAINT "users_email_length" CHECK (char_length("users"."email") between 3 and 254)
);
