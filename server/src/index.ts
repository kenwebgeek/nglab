import { pino } from 'pino';
import { createApp } from './app.js';
import { config } from './config.js';
import { db, pool } from './db/client.js';
import { createAccountsRepository } from './accounts/repository.js';
import { createSessionsRepository } from './auth/sessions-repository.js';
import { createPasswordResetRepository } from './auth/password-reset-repository.js';
import { createSmtpPasswordResetMailer } from './auth/password-reset-mailer.js';
import { createUsersRepository } from './users/repository.js';

const logger = pino({ level: config.logLevel });

const app = createApp({
  users: createUsersRepository(db),
  accounts: createAccountsRepository(db),
  sessions: createSessionsRepository(db),
  passwordReset: createPasswordResetRepository(db),
  passwordResetMailer: config.smtp ? createSmtpPasswordResetMailer(config.smtp) : undefined,
  secureCookies: config.secureCookies,
  checkDatabase: async () => {
    await pool.query('select 1');
  },
  corsOrigin: config.corsOrigin,
  appUrl: config.appUrl,
  logger,
});

// Express 5 also passes startup failures (for example EADDRINUSE) to this callback
const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) {
    logger.error({ err: error.message, port: config.port }, 'API failed to start');
    process.exit(1);
  }
  logger.info({ host: config.host, port: config.port, corsOrigin: config.corsOrigin }, 'API listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  // Don't hang on keep-alive connections
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
