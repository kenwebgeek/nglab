import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { Logger } from 'pino';
import { accounts, emailVerificationTokens, users } from '../db/schema.js';
import type { Db } from '../users/repository.js';
import { createSmtpTransport, type SmtpOptions } from './password-reset-mailer.js';

export interface VerificationEmail {
  to: string;
  verificationUrl: string;
}

export interface VerificationMailer {
  sendVerification(email: VerificationEmail): Promise<void>;
}

export function createSmtpVerificationMailer(options: SmtpOptions): VerificationMailer {
  const transport = createSmtpTransport(options);
  return {
    async sendVerification({ to, verificationUrl }) {
      await transport.sendMail({
        from: options.from,
        to,
        subject: 'Verify your NgLab email address',
        text: `Verify your email address: ${verificationUrl}\n\nThis link expires in 24 hours and can be used once.\nIf you did not create an account, you can ignore this email.`,
      });
    },
  };
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const verificationTtlMs = 24 * 60 * 60 * 1000;

export function createEmailVerification(db: Db, mailer: VerificationMailer | undefined, appUrl: string, logger: Logger) {
  return {
    async send(userId: number): Promise<void> {
      const token = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(token);
      const email = await db.transaction(async (tx) => {
        const [user] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).for('update');
        const [account] = await tx.select({ verified: accounts.emailVerified }).from(accounts)
          .where(eq(accounts.userId, userId)).for('update');
        if (!user || !account || account.verified) return null;
        if (!mailer) return user.email;

        await tx.insert(emailVerificationTokens).values({
          userId, tokenHash, email: user.email, expiresAt: new Date(Date.now() + verificationTtlMs),
        }).onConflictDoUpdate({
          target: emailVerificationTokens.userId,
          set: { tokenHash, email: user.email, expiresAt: new Date(Date.now() + verificationTtlMs) },
        });
        return user.email;
      });
      if (!email) return;
      if (!mailer) {
        logger.error('Verification email is not configured');
        return;
      }

      try {
        await mailer.sendVerification({
          to: email,
          verificationUrl: `${appUrl}/verify-email?token=${encodeURIComponent(token)}`,
        });
      } catch (error) {
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.tokenHash, tokenHash));
        logger.error({ error: error instanceof Error ? error.name : 'UnknownEmailError' }, 'Verification email failed');
      }
    },

    async verify(token: string): Promise<boolean> {
      const tokenHash = hashToken(token);
      return db.transaction(async (tx) => {
        const [candidate] = await tx.select().from(emailVerificationTokens)
          .where(and(eq(emailVerificationTokens.tokenHash, tokenHash), gt(emailVerificationTokens.expiresAt, new Date())));
        if (!candidate) return false;

        const [user] = await tx.select({ email: users.email }).from(users)
          .where(eq(users.id, candidate.userId)).for('update');
        const [account] = await tx.select({ verified: accounts.emailVerified }).from(accounts)
          .where(eq(accounts.userId, candidate.userId)).for('update');
        if (!user || !account || account.verified || user.email !== candidate.email) return false;

        const [consumed] = await tx.delete(emailVerificationTokens)
          .where(and(eq(emailVerificationTokens.tokenHash, tokenHash), gt(emailVerificationTokens.expiresAt, new Date())))
          .returning({ userId: emailVerificationTokens.userId });
        if (!consumed) return false;
        await tx.update(accounts).set({ emailVerified: true }).where(eq(accounts.userId, consumed.userId));
        return true;
      });
    },
  };
}

export type EmailVerification = ReturnType<typeof createEmailVerification>;
