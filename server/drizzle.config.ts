import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Migrations run as the admin role; the API itself connects as the app role
const url = process.env['MIGRATION_DATABASE_URL'];
if (!url) {
  throw new Error('MIGRATION_DATABASE_URL is not set (see server/.env.example)');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
});
