import { z } from 'zod';

// Login only checks the shape: whether the credentials are right is a 401, not a validation error
export const loginSchema = z.object({
  email: z.string({ error: 'Email is required' }).trim().min(1, 'Email is required').max(254, 'Email is too long'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128, 'Password is too long'),
});
