import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema.js';
import { accounts, sessions, users, type UserRow } from '../db/schema.js';
import { HttpError } from '../http-error.js';
import type { ManagedUserInput } from './validation.js';

export type Db = NodePgDatabase<typeof schema>;

// The shape the Angular app already consumes (matches its User interface)
export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  currentActivity: string;
  admin: boolean;
}

// NULL in the database is exposed as '' so the frontend contract doesn't change
export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname ?? '',
    email: row.email,
    currentActivity: row.currentActivity ?? '',
    admin: row.admin,
  };
}

export function createUsersRepository(db: Db) {
  return {
    async list(): Promise<UserDto[]> {
      const rows = await db.select().from(users).orderBy(asc(users.id));
      return rows.map(toUserDto);
    },

    async create(input: ManagedUserInput): Promise<UserDto> {
      const [row] = await db.insert(users).values(input).returning();
      return toUserDto(row!);
    },

    // updated_at is maintained by a database trigger
    async update(id: number, input: ManagedUserInput): Promise<UserDto | null> {
      const [row] = await db.update(users).set(input).where(eq(users.id, id)).returning();
      return row ? toUserDto(row) : null;
    },

    async updateWithPassword(id: number, input: ManagedUserInput, passwordHash: string): Promise<UserDto | null> {
      return db.transaction(async (tx) => {
        const [target] = await tx.select().from(users).where(eq(users.id, id)).for('update');
        if (!target) {
          return null;
        }
        if (target.admin || input.admin === true) {
          throw new HttpError(403, 'forbidden', 'Admin passwords cannot be set by another user');
        }

        const [updated] = await tx.update(users).set(input).where(eq(users.id, id)).returning();
        await tx.insert(accounts).values({ userId: id, passwordHash }).onConflictDoUpdate({
          target: accounts.userId,
          set: { passwordHash, updatedAt: new Date() },
        });
        await tx.delete(sessions).where(eq(sessions.userId, id));
        return toUserDto(updated!);
      });
    },

    async remove(id: number): Promise<boolean> {
      const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      return rows.length > 0;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
