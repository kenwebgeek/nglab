import { sql } from 'drizzle-orm';
import { check, customType, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Case-insensitive text; the citext extension is created in a hand-written migration
const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

export const users = pgTable(
  'users',
  {
    // ALWAYS: clients can't set ids; the Phase 4 import uses OVERRIDING SYSTEM VALUE
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    // Blank values are stored as NULL; the API maps them to '' for the frontend
    nickname: text('nickname'),
    email: citext('email').notNull().unique('users_email_unique'),
    currentActivity: text('current_activity'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('users_first_name_length', sql`char_length(btrim(${table.firstName})) between 2 and 100`),
    check('users_last_name_length', sql`char_length(btrim(${table.lastName})) between 2 and 100`),
    // A NULL value passes a CHECK, so these only constrain non-null values
    check('users_nickname_length', sql`char_length(btrim(${table.nickname})) between 1 and 100`),
    check('users_current_activity_length', sql`char_length(btrim(${table.currentActivity})) between 1 and 200`),
    check('users_email_length', sql`char_length(${table.email}) between 3 and 254`),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// Login credentials. The profile (email, names, nickname) lives in `users`, and the email is the username.
export const accounts = pgTable(
  'accounts',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Self-describing scrypt hash (see accounts/password.ts); never the password itself
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('accounts_password_hash_not_empty', sql`char_length(${table.passwordHash}) > 0`)],
);

export type AccountRow = typeof accounts.$inferSelect;

// Login sessions. Only a SHA-256 hash of the token is stored, so a database leak cannot be replayed as cookies.
export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId), index('sessions_expires_at_idx').on(table.expiresAt)],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('password_reset_tokens_user_id_idx').on(table.userId),
    index('password_reset_tokens_expires_at_idx').on(table.expiresAt),
  ],
);
