const port = Number(process.env['PORT'] ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT must be an integer between 1 and 65535 (got "${process.env['PORT']}")`);
}

export const config = {
  port,
  // Loopback only by default, like the database; set HOST to expose the API deliberately
  host: process.env['HOST'] ?? '127.0.0.1',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
  logLevel: process.env['LOG_LEVEL'] ?? 'info',
  // Cookies are marked Secure in production; set COOKIE_SECURE=true to force it elsewhere
  secureCookies: process.env['COOKIE_SECURE'] === 'true' || process.env['NODE_ENV'] === 'production',
};
