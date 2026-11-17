import { z } from 'zod';
import { userInputSchema } from '../users/validation.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// The profile fields follow the users rules, because signing up creates a user.
// Unknown keys (including any `id`) are stripped. The password is deliberately not trimmed.
export const accountInputSchema = userInputSchema
  .pick({ email: true, firstName: true, lastName: true, nickname: true })
  .extend({
    password: z
      .string({ error: 'Password is required' })
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`),
  });

export type AccountInput = z.output<typeof accountInputSchema>;
