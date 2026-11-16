import { sql } from 'drizzle-orm';
import { check, customType, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
