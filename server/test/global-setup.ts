import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { getTestUrls } from './test-env.js';

// Runs once before all test files: applies the real migrations to the throwaway database,
// so the tests also exercise the committed migration files.
export default async function setup(): Promise<void> {
  const pool = new pg.Pool({ connectionString: getTestUrls().admin });
  try {
    try {
      await pool.query('select 1');
    } catch {
      throw new Error('Cannot reach the test database. Start it with `npm run db:test:up` (or run the tests with `npm run api:test`).');
    }
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}
