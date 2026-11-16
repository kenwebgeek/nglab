export interface PgError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

// Drizzle wraps driver errors in DrizzleQueryError, keeping the original as `cause`
export function unwrapPgError(err: unknown): PgError | undefined {
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
