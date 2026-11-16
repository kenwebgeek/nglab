import { config } from 'dotenv';

config({ quiet: true });

export interface TestUrls {
  app: string;
  admin: string;
}

// The tests truncate tables, so they must never touch the development database. They reuse its
// credentials but always connect to the throwaway container on TEST_DB_PORT.
export function getTestUrls(env: NodeJS.ProcessEnv = process.env): TestUrls {
  const devApp = env['DATABASE_URL'];
  const devAdmin = env['MIGRATION_DATABASE_URL'];
  if (!devApp || !devAdmin) {
    throw new Error('DATABASE_URL and MIGRATION_DATABASE_URL must be set (see server/.env.example); the tests reuse their credentials');
  }

  const testPort = env['TEST_DB_PORT'] ?? '5434';
  const toTestUrl = (raw: string): string => {
    const url = new URL(raw);
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      throw new Error(`Refusing to run tests against a non-local database host (${url.hostname})`);
    }
    if (url.port === testPort) {
      throw new Error(`TEST_DB_PORT (${testPort}) is the development database's port; refusing to run tests against it`);
    }
    url.port = testPort;
    return url.toString();
  };

  return { app: toTestUrl(devApp), admin: toTestUrl(devAdmin) };
}
