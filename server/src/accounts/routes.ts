import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { RateLimitOptions } from '../rate-limit.js';
import type { AccountsRepository } from './repository.js';
import { hashPassword } from './password.js';
import { accountInputSchema } from './validation.js';

export const DEFAULT_SIGNUP_RATE_LIMIT: RateLimitOptions = { windowMs: 15 * 60 * 1000, limit: 10 };

export function createAccountsRouter(
  accounts: AccountsRepository,
  signupRateLimit: RateLimitOptions = DEFAULT_SIGNUP_RATE_LIMIT,
): Router {
  const router = Router();

  // Hashing is deliberately expensive, so signups are limited per client
  const limiter = rateLimit({
    ...signupRateLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'too_many_requests', message: 'Too many sign-up attempts. Please try again later.' },
  });

  router.post('/', limiter, async (req, res) => {
    const { password, ...profile } = accountInputSchema.parse(req.body);
    res.status(201).json(await accounts.create(profile, await hashPassword(password)));
  });

  return router;
}
