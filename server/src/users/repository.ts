import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema.js';
import { users, type UserRow } from '../db/schema.js';
import type { UserInput } from './validation.js';

export type Db = NodePgDatabase<typeof schema>;

// The shape the Angular app already consumes (matches its User interface)
export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  currentActivity: string;
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
  };
}

export function createUsersRepository(db: Db) {
  return {
    async list(): Promise<UserDto[]> {
      const rows = await db.select().from(users).orderBy(asc(users.id));
      return rows.map(toUserDto);
    },

    async create(input: UserInput): Promise<UserDto> {
      const [row] = await db.insert(users).values(input).returning();
      return toUserDto(row!);
    },

    // updated_at is maintained by a database trigger
    async update(id: number, input: UserInput): Promise<UserDto | null> {
      const [row] = await db.update(users).set(input).where(eq(users.id, id)).returning();
      return row ? toUserDto(row) : null;
    },

    async remove(id: number): Promise<boolean> {
      const rows = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
      return rows.length > 0;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
