import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { sessions, users } from '../db/schema.js';
import { toUserDto, type Db, type UserDto } from '../users/repository.js';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSessionsRepository(db: Db, ttlMs: number = SESSION_TTL_MS) {
  return {
    // The token is returned once, for the cookie; only its hash is stored
    async create(userId: number): Promise<{ token: string; expiresAt: Date }> {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + ttlMs);
      await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
      return { token, expiresAt };
    },

    // The signed-in user for a cookie value, or null when it is missing, unknown or expired
    async findUser(token: string | undefined): Promise<UserDto | null> {
      if (!token) {
        return null;
      }
      const [row] = await db
        .select({ user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())));
      return row ? toUserDto(row.user) : null;
    },

    async remove(token: string | undefined): Promise<void> {
      if (token) {
        await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
      }
    },

    async purgeExpired(): Promise<void> {
      await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
