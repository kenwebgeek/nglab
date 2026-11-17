import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'session';

// `secure` keeps the cookie off plain HTTP, so it is off only for local development
function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

export function readSessionToken(req: Request): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === SESSION_COOKIE) {
      return part.slice(separator + 1).trim() || undefined;
    }
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date, secure: boolean): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(secure), expires: expiresAt });
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions(secure));
}
