import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { accounts, passwordResetTokens, sessions } from '../db/schema.js';
import type { Db } from '../users/repository.js';

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createPasswordResetRepository(db: Db, ttlMs: number = PASSWORD_RESET_TTL_MS) {
  return {
    async create(userId: number): Promise<{ token: string; expiresAt: Date }> {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + ttlMs);

      await db.transaction(async (tx) => {
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
        await tx.insert(passwordResetTokens).values({ tokenHash: hashToken(token), userId, expiresAt });
      });

      return { token, expiresAt };
    },

    async remove(token: string): Promise<void> {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashToken(token)));
    },

    async resetPassword(token: string, passwordHash: string): Promise<boolean> {
      return db.transaction(async (tx) => {
        const [consumed] = await tx
          .delete(passwordResetTokens)
          .where(and(
            eq(passwordResetTokens.tokenHash, hashToken(token)),
            gt(passwordResetTokens.expiresAt, new Date()),
          ))
          .returning({ userId: passwordResetTokens.userId });
        if (!consumed) {
          return false;
        }

        const [account] = await tx
          .update(accounts)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(accounts.userId, consumed.userId))
          .returning({ userId: accounts.userId });
        if (!account) {
          return false;
        }

        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, consumed.userId));
        await tx.delete(sessions).where(eq(sessions.userId, consumed.userId));
        return true;
      });
    },

    async purgeExpired(): Promise<void> {
      await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
    },
  };
}

export type PasswordResetRepository = ReturnType<typeof createPasswordResetRepository>;
