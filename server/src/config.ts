import type { SmtpOptions } from './auth/password-reset-mailer.js';

const port = Number(process.env['PORT'] ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT must be an integer between 1 and 65535 (got "${process.env['PORT']}")`);
}

const smtpHost = process.env['SMTP_HOST'];
const smtpFrom = process.env['SMTP_FROM'];
const smtpUser = process.env['SMTP_USER'];
const smtpPassword = process.env['SMTP_PASSWORD'];
let smtp: SmtpOptions | undefined;

if (smtpHost || smtpFrom || smtpUser || smtpPassword) {
  if (!smtpHost || !smtpFrom) {
    throw new Error('SMTP_HOST and SMTP_FROM must both be set to enable password reset email');
  }
  if (Boolean(smtpUser) !== Boolean(smtpPassword)) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must both be set, or both be omitted');
  }

  const smtpPort = Number(process.env['SMTP_PORT'] ?? 587);
  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error(`SMTP_PORT must be an integer between 1 and 65535 (got "${process.env['SMTP_PORT']}")`);
  }
  smtp = {
    host: smtpHost,
    port: smtpPort,
    secure: process.env['SMTP_SECURE'] === 'true',
    user: smtpUser,
    password: smtpPassword,
    from: smtpFrom,
  };
}

export const config = {
  port,
  // Loopback only by default, like the database; set HOST to expose the API deliberately
  host: process.env['HOST'] ?? '127.0.0.1',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
  logLevel: process.env['LOG_LEVEL'] ?? 'info',
  appUrl: (process.env['APP_URL'] ?? process.env['CORS_ORIGIN'] ?? 'http://localhost:4200').replace(/\/$/, ''),
  smtp,
  // Cookies are marked Secure in production; set COOKIE_SECURE=true to force it elsewhere
  secureCookies: process.env['COOKIE_SECURE'] === 'true' || process.env['NODE_ENV'] === 'production',
};
