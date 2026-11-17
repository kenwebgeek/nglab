import cors from 'cors';
import express, { type Express } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { errorHandler } from './middleware/error-handler.js';
import { createAccountsRouter } from './accounts/routes.js';
import type { RateLimitOptions } from './rate-limit.js';
import type { AccountsRepository } from './accounts/repository.js';
import { createUsersRouter } from './users/routes.js';
import type { UsersRepository } from './users/repository.js';

export interface AppDependencies {
  users: UsersRepository;
  accounts: AccountsRepository;
  // Defaults to 10 sign-ups per client per 15 minutes
  signupRateLimit?: RateLimitOptions;
  // Rejects when the database is unreachable
  checkDatabase: () => Promise<void>;
  corsOrigin: string;
  logger: Logger;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');

  // Request logs carry only method, path (no query string) and status: no bodies, no user data
  app.use(
    pinoHttp({
      logger: deps.logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      serializers: {
        req: (req) => ({ method: req.method, url: req.url?.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(cors({ origin: deps.corsOrigin, methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await deps.checkDatabase();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use('/accounts', createAccountsRouter(deps.accounts, deps.signupRateLimit));
  app.use('/users', createUsersRouter(deps.users));

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' });
  });
  app.use(errorHandler);

  return app;
}
