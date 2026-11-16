import type { AddressInfo } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { pino } from 'pino';
import { createApp } from '../src/app.js';
import * as schema from '../src/db/schema.js';
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

// The API under test, on an ephemeral port, connected as the least-privilege app role.
// Pass a connection string to point it somewhere else (for example a database with a wrong password).
export async function startServer(appUrl: string = getTestUrls().app): Promise<TestServer> {
  const pool = new pg.Pool({ connectionString: appUrl });
  const db = drizzle({ client: pool, schema });
  const logs: string[] = [];
  const logger = pino({ level: 'info' }, { write: (line: string) => void logs.push(line) });

  const app = createApp({
    users: createUsersRepository(db),
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

export async function resetUsers(admin: pg.Pool): Promise<void> {
  await admin.query('truncate users restart identity');
}

export const validUser = {
  firstName: 'Tony',
  lastName: 'Stark',
  nickname: 'Iron Man',
  email: 'tony@avengers.com',
  currentActivity: 'Being a genius',
};
