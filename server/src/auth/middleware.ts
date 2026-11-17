import type { RequestHandler } from 'express';
import { HttpError } from '../http-error.js';
import type { UserDto } from '../users/repository.js';
import { readSessionToken } from './session-cookie.js';
import type { SessionsRepository } from './sessions-repository.js';

// Who is making the request. Roles and permissions will be added here for authorization.
export interface AuthContext {
  user: UserDto;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function requireAuth(sessions: Pick<SessionsRepository, 'findUser'>): RequestHandler {
  return async (req, _res, next) => {
    try {
      const user = await sessions.findUser(readSessionToken(req));
      if (!user) {
        throw new HttpError(401, 'unauthenticated', 'You need to log in');
      }
      req.auth = { user };
      next();
    } catch (error) {
      next(error);
    }
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Cookies are sent automatically, so a state-changing request from another origin is refused outright.
// Requests without an Origin header (curl, server-to-server) are not browser requests and are let through.
export function requireSameOrigin(allowedOrigin: string): RequestHandler {
  return (req, _res, next) => {
    const origin = req.headers.origin;
    if (!SAFE_METHODS.has(req.method) && origin !== undefined && origin !== allowedOrigin) {
      next(new HttpError(403, 'forbidden_origin', 'This origin is not allowed'));
      return;
    }
    next();
  };
}
