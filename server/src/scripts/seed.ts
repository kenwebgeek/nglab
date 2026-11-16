import { z } from 'zod';
import { userInputSchema, type UserInput } from '../users/validation.js';

// db.json rows carry an id that must be preserved, unlike API input where the id is ignored
const seedUserSchema = userInputSchema.extend({
  id: z.number({ error: 'id must be a number' }).int('id must be an integer').min(1, 'id must be at least 1').max(2_147_483_647),
});

export type SeedUser = UserInput & { id: number };

export interface SeedIssue {
  // Position in the file's users array, or null for file-level problems
  index: number | null;
  id: number | string | null;
  message: string;
}

export type SeedResult = { ok: true; users: SeedUser[] } | { ok: false; issues: SeedIssue[] };

// Validates every row (not just the first failure) so one dry run lists all the problems
export function parseSeedFile(raw: string): SeedResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, issues: [{ index: null, id: null, message: 'File is not valid JSON' }] };
  }

  const rows = (data as { users?: unknown } | null)?.users;
  if (!Array.isArray(rows)) {
    return { ok: false, issues: [{ index: null, id: null, message: 'Expected a top-level "users" array' }] };
  }

  const issues: SeedIssue[] = [];
  const users: SeedUser[] = [];
  const idsSeen = new Map<number, number>();
  const emailsSeen = new Map<string, number>();

  rows.forEach((row, index) => {
    const parsed = seedUserSchema.safeParse(row);
    const fields = (row ?? {}) as { id?: unknown; email?: unknown };
    const label = typeof fields.id === 'number' || typeof fields.id === 'string' ? fields.id : null;

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        issues.push({ index, id: label, message: field ? `${field}: ${issue.message}` : issue.message });
      }
    }

    // Duplicates are checked on the raw values too, so one run reports every problem in the file
    if (typeof fields.id === 'number') {
      const firstId = idsSeen.get(fields.id);
      if (firstId !== undefined) {
        issues.push({ index, id: fields.id, message: `duplicate id (also at index ${firstId})` });
      } else {
        idsSeen.set(fields.id, index);
      }
    }
    // The database enforces case-insensitive uniqueness, so check it the same way
    if (typeof fields.email === 'string' && fields.email.trim() !== '') {
      const emailKey = fields.email.trim().toLowerCase();
      const firstEmail = emailsSeen.get(emailKey);
      if (firstEmail !== undefined) {
        issues.push({ index, id: label, message: `duplicate email (also at index ${firstEmail})` });
      } else {
        emailsSeen.set(emailKey, index);
      }
    }

    if (parsed.success) {
      users.push(parsed.data);
    }
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, users };
}
