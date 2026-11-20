import { z } from 'zod';

// Login only checks the shape: whether the credentials are right is a 401, not a validation error
export const loginSchema = z.object({
  email: z.string({ error: 'Email is required' }).trim().min(1, 'Email is required').max(254, 'Email is too long'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128, 'Password is too long'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: 'Current password is required' })
    .min(1, 'Current password is required')
    .max(128, 'Current password is too long'),
  newPassword: z
    .string({ error: 'New password is required' })
    .min(12, 'New password must be at least 12 characters')
    .max(128, 'New password must be at most 128 characters')
    .refine((password) => /\d/.test(password), 'New password must include a number')
    .refine((password) => /[^A-Za-z0-9]/.test(password), 'New password must include a symbol'),
});
