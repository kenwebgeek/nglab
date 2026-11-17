import type { AddressInfo } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { pino } from 'pino';
import { createApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
import { createAccountsRepository } from '../src/accounts/repository.js';
import { createSessionsRepository } from '../src/auth/sessions-repository.js';
import type { RateLimitOptions } from '../src/rate-limit.js';
import { createUsersRepository } from '../src/users/repository.js';
import { getTestUrls } from './test-env.js';

export interface ApiResponse {
  status: number;
  headers: Headers;
  // Parsed JSON body (undefined when empty)
  body: any;
  text: string;
}

export interface TestServer {
  baseUrl: string;
  // Every log line the API wrote, so tests can assert nothing sensitive was logged
  logs: string[];
  close: () => Promise<void>;
}

export interface StartServerOptions {
  // Sessions are checked for real only when a test is about authentication; by default every request
  // counts as signed in, so the users tests don't need a login for each call
  realAuth?: boolean;
  loginRateLimit?: RateLimitOptions;
  sessionTtlMs?: number;
}

const testUser = {
  id: 0,
  firstName: 'Test',
  lastName: 'Session',
  nickname: '',
  email: 'test.session@example.com',
  currentActivity: '',
};

// The API under test, on an ephemeral port, connected as the least-privilege app role.
// Pass a connection string to point it somewhere else (for example a database with a wrong password).
export async function startServer(
  appUrl: string = getTestUrls().app,
  // High by default so tests that sign up repeatedly are never throttled
  signupRateLimit: RateLimitOptions = { windowMs: 60_000, limit: 10_000 },
  options: StartServerOptions = {},
): Promise<TestServer> {
  const pool = new pg.Pool({ connectionString: appUrl });
  const db = drizzle({ client: pool, schema });
  const realSessions = createSessionsRepository(db, options.sessionTtlMs);
  const logs: string[] = [];
  const logger = pino({ level: 'info' }, { write: (line: string) => void logs.push(line) });

  const app = createApp({
    users: createUsersRepository(db),
    accounts: createAccountsRepository(db),
    sessions: options.realAuth ? realSessions : { ...realSessions, findUser: async () => testUser },
    signupRateLimit,
    loginRateLimit: options.loginRateLimit ?? { windowMs: 60_000, limit: 10_000 },
    secureCookies: false,
    checkDatabase: async () => {
      await pool.query('select 1');
    },
    corsOrigin: 'http://localhost:4200',
    logger,
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    logs,
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      await pool.end();
    },
  };
}

export async function call(
  baseUrl: string,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<ApiResponse> {
  const isRaw = typeof body === 'string';
  const response = await fetch(baseUrl + path, {
    method,
    headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : isRaw ? body : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : undefined, text };
}

// Direct access as the admin role, for resetting state and checking what is really stored
export function createAdminPool(): pg.Pool {
  return new pg.Pool({ connectionString: getTestUrls().admin });
}

export function createAppPool(): pg.Pool {
  return new pg.Pool({ connectionString: getTestUrls().app });
}

// Accounts and sessions reference users, so they are cleared together
export async function resetUsers(admin: pg.Pool): Promise<void> {
  await admin.query('truncate users, accounts, sessions restart identity');
}

// Signs up and logs in, returning the Cookie header value for later requests
export async function signIn(
  baseUrl: string,
  credentials: { email: string; password: string; firstName?: string; lastName?: string },
): Promise<string> {
  const signup = await call(baseUrl, 'POST', '/accounts', { firstName: 'Ada', lastName: 'Lovelace', ...credentials });
  if (signup.status !== 201) {
    throw new Error(`Sign-up failed with ${signup.status}: ${signup.text}`);
  }
  const login = await call(baseUrl, 'POST', '/auth/login', { email: credentials.email, password: credentials.password });
  const cookie = login.headers.getSetCookie()[0]?.split(';')[0];
  if (login.status !== 200 || !cookie) {
    throw new Error(`Login failed with ${login.status}: ${login.text}`);
  }
  return cookie;
}

export const validUser = {
  firstName: 'Tony',
  lastName: 'Stark',
  nickname: 'Iron Man',
  email: 'tony@avengers.com',
  currentActivity: 'Being a genius',
};
