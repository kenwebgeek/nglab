import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AccountsRepository } from '../accounts/repository.js';
import { hashPassword, verifyPassword } from '../accounts/password.js';
import { HttpError } from '../http-error.js';
import type { RateLimitOptions } from '../rate-limit.js';
import { toUserDto } from '../users/repository.js';
import { requireAuth } from './middleware.js';
import { clearSessionCookie, readSessionToken, setSessionCookie } from './session-cookie.js';
import type { SessionsRepository } from './sessions-repository.js';
import { changePasswordSchema, loginSchema } from './validation.js';

export const DEFAULT_LOGIN_RATE_LIMIT: RateLimitOptions = { windowMs: 15 * 60 * 1000, limit: 10 };

// Checked when the email is unknown, so that path costs the same as a wrong password
const dummyHash = hashPassword('not-a-real-password');

export interface AuthRouterOptions {
  accounts: AccountsRepository;
  sessions: SessionsRepository;
  loginRateLimit?: RateLimitOptions;
  secureCookies: boolean;
}

export function createAuthRouter({
  accounts,
  sessions,
  loginRateLimit = DEFAULT_LOGIN_RATE_LIMIT,
  secureCookies,
}: AuthRouterOptions): Router {
  const router = Router();

  // Only failed attempts count, so signing in normally never uses up the allowance
  const loginLimiter = rateLimit({
    ...loginRateLimit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'too_many_requests', message: 'Too many login attempts. Please try again later.' },
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const credentials = await accounts.findCredentials(email);
    const passwordMatches = await verifyPassword(password, credentials?.passwordHash ?? (await dummyHash));
    if (!credentials || !passwordMatches) {
      throw new HttpError(401, 'invalid_credentials', 'Incorrect email or password');
    }

    await sessions.purgeExpired();
    const { token, expiresAt } = await sessions.create(credentials.user.id);
    setSessionCookie(res, token, expiresAt, secureCookies);
    res.json(toUserDto(credentials.user));
  });

  // Idempotent: logging out without a session is not an error
  router.post('/logout', async (req, res) => {
    await sessions.remove(readSessionToken(req));
    clearSessionCookie(res, secureCookies);
    res.status(204).end();
  });

  router.get('/me', requireAuth(sessions), (req, res) => {
    res.json(req.auth!.user);
  });

  router.put('/password', requireAuth(sessions), async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const passwordHash = await accounts.findPasswordHash(req.auth!.user.id);
    const passwordMatches = await verifyPassword(currentPassword, passwordHash ?? (await dummyHash));
    if (!passwordHash || !passwordMatches) {
      throw new HttpError(400, 'invalid_current_password', 'Current password is incorrect');
    }

    const updated = await accounts.updatePassword(req.auth!.user.id, await hashPassword(newPassword));
    if (!updated) {
      throw new HttpError(404, 'account_not_found', 'Account not found');
    }
    res.status(204).end();
  });

  return router;
}
