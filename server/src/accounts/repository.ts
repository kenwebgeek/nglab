import { eq } from 'drizzle-orm';
import { accounts, passwordResetTokens, sessions, users, type UserRow } from '../db/schema.js';
import { toUserDto, type Db, type UserDto } from '../users/repository.js';
import type { AccountInput } from './validation.js';

export function createAccountsRepository(db: Db) {
  return {
    // Creates the user and their credentials together, so a failure never leaves a user without an account.
    // A duplicate email surfaces as the users_email_unique violation, mapped to 409 by the error handler.
    async create(profile: Omit<AccountInput, 'password'>, passwordHash: string): Promise<UserDto> {
      return db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values(profile).returning();
        await tx.insert(accounts).values({ userId: user!.id, passwordHash, emailVerified: false });
        return toUserDto(user!);
      });
    },

    // The user with this email and their password hash; null when there is no such user or they have no account.
    // The email column is case-insensitive (citext), so the lookup is too.
    async findCredentials(email: string): Promise<{ user: UserRow; passwordHash: string; emailVerified: boolean } | null> {
      const [row] = await db
        .select({ user: users, passwordHash: accounts.passwordHash, emailVerified: accounts.emailVerified })
        .from(users)
        .innerJoin(accounts, eq(accounts.userId, users.id))
        .where(eq(users.email, email));
      return row ?? null;
    },

    async findPasswordHash(userId: number): Promise<string | null> {
      const [row] = await db
        .select({ passwordHash: accounts.passwordHash })
        .from(accounts)
        .where(eq(accounts.userId, userId));
      return row?.passwordHash ?? null;
    },

    async updatePasswordAndRevokeSessions(userId: number, passwordHash: string): Promise<boolean> {
      return db.transaction(async (tx) => {
        const result = await tx
          .update(accounts)
          .set({ passwordHash, updatedAt: new Date() })
          .where(eq(accounts.userId, userId))
          .returning({ userId: accounts.userId });
        if (result.length !== 1) {
          return false;
        }

        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
        await tx.delete(sessions).where(eq(sessions.userId, userId));
        return true;
      });
    },
  };
}

export type AccountsRepository = ReturnType<typeof createAccountsRepository>;
