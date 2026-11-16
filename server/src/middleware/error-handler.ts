import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../http-error.js';

interface PgError extends Error {
  code?: string;
  constraint?: string;
}

// Drizzle wraps driver errors in DrizzleQueryError, keeping the original as `cause`
function unwrapPgError(err: unknown): PgError | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    const candidate = current as PgError;
    if (typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return candidate;
    }
    current = current.cause;
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'validation_error',
      message: 'The request body is invalid',
      issues: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  // body-parser errors carry an HTTP status and a type
  const type = (err as { type?: string }).type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'invalid_json', message: 'The request body is not valid JSON' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ error: 'payload_too_large', message: 'The request body is too large' });
    return;
  }

  const pgError = unwrapPgError(err);
  if (pgError?.code === '23505' && pgError.constraint === 'users_email_unique') {
    res.status(409).json({ error: 'email_taken', message: 'A user with this email already exists' });
    return;
  }
  // Safety net: the schema validation should make these unreachable
  if (pgError?.code === '23514' || pgError?.code === '23502') {
    res.status(400).json({ error: 'validation_error', message: 'The request body is invalid' });
    return;
  }

  // Never log the raw error: Drizzle's message embeds the query parameters (user data)
  // and pg's `detail` embeds the failing row.
  req.log.error(
    {
      errorName: err instanceof Error ? err.name : typeof err,
      pgCode: pgError?.code,
      pgConstraint: pgError?.constraint,
      pgMessage: pgError?.message,
    },
    'Unhandled error',
  );
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
};
