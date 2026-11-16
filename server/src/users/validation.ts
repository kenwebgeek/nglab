import { z } from 'zod';
import { HttpError } from '../http-error.js';

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(max, `${label} must be at most ${max} characters`);

// Blank, missing and null all become null: the database stores NULL for "no value"
const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .nullish()
    .transform((value) => value || null);

// Unknown keys (notably the form's `id: ''`) are stripped, so a client can never choose an id
export const userInputSchema = z.object({
  firstName: requiredText('First name', 100),
  lastName: requiredText('Last name', 100),
  nickname: optionalText('Nickname', 100),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .max(254, 'Email must be at most 254 characters')
    .pipe(z.email('Email must be a valid address')),
  currentActivity: optionalText('Current activity', 200),
});

export type UserInput = z.output<typeof userInputSchema>;

const MAX_ID = 2_147_483_647;

export function parseId(raw: string | undefined): number {
  if (!raw || !/^[1-9]\d*$/.test(raw) || Number(raw) > MAX_ID) {
    throw new HttpError(400, 'invalid_id', 'The user id must be a positive integer');
  }
  return Number(raw);
}
