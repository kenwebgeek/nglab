import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../db/schema.js';
import { users } from '../db/schema.js';
import { unwrapPgError } from '../db/pg-error.js';
import { parseSeedFile, type SeedUser } from './seed.js';

const USAGE = `Usage: npm run db:seed -- [--file <path>] [--dry-run] [--upsert]

  --file <path>  JSON file with a top-level "users" array (default: ../db.json)
  --dry-run      Validate the file and report what would change; writes nothing
  --upsert       Allow a non-empty users table: update rows with matching ids, insert the rest
                 (without it, the import refuses to touch a table that already has rows)`;

const { values: args } = parseArgs({
  options: {
    file: { type: 'string', default: '../db.json' },
    'dry-run': { type: 'boolean', default: false },
    upsert: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

// The import preserves ids and resets the id sequence, which needs more than the app role may do
const url = process.env['MIGRATION_DATABASE_URL'];
if (!url) {
  console.error('MIGRATION_DATABASE_URL is not set (see server/.env.example)');
  process.exit(1);
}

const filePath = resolve(args.file);
const dryRun = args['dry-run'];
const upsert = args.upsert;

const parsed = parseSeedFile(await readFile(filePath, 'utf8'));
if (!parsed.ok) {
  console.error(`${filePath} is not valid:`);
  for (const issue of parsed.issues) {
    const where = issue.index === null ? 'file' : `users[${issue.index}] (id ${issue.id ?? '?'})`;
    console.error(`  - ${where}: ${issue.message}`);
  }
  process.exit(1);
}
const seed = parsed.users;
console.log(`Read ${seed.length} valid users from ${filePath}`);

const pool = new pg.Pool({ connectionString: url });
const db = drizzle({ client: pool, schema });

// Compare on the stored shape: blanks are NULL, text is trimmed (the schema already normalised both)
const columns = ['firstName', 'lastName', 'nickname', 'email', 'currentActivity'] as const;
function differences(expected: SeedUser, actual: typeof users.$inferSelect): string[] {
  return columns.filter((column) => expected[column] !== actual[column]);
}

try {
  const existing = await db.select().from(users);
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const toUpdate = seed.filter((user) => existingById.has(user.id));
  const toInsert = seed.filter((user) => !existingById.has(user.id));
  const changed = toUpdate.filter((user) => differences(user, existingById.get(user.id)!).length > 0);
  const extra = existing.filter((row) => !seed.some((user) => user.id === row.id));

  console.log(
    `Database has ${existing.length} users: would insert ${toInsert.length}, ` +
      `update ${changed.length} (${toUpdate.length - changed.length} already identical)` +
      (extra.length > 0 ? `, and leave ${extra.length} not in the file untouched` : ''),
  );

  if (existing.length > 0 && !upsert) {
    console.error('The users table is not empty. Re-run with --upsert to update matching ids, or reset the database first.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('Dry run: nothing was written.');
    process.exit(0);
  }

  // One transaction: either every row lands and the sequence is reset, or nothing changes
  await db.transaction(async (tx) => {
    for (const user of seed) {
      // Drizzle has no public OVERRIDING SYSTEM VALUE support; every value is still a bound parameter
      await tx.execute(sql`
        insert into users (id, first_name, last_name, nickname, email, current_activity)
        overriding system value
        values (${user.id}, ${user.firstName}, ${user.lastName}, ${user.nickname}, ${user.email}, ${user.currentActivity})
        on conflict (id) do update set
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          nickname = excluded.nickname,
          email = excluded.email,
          current_activity = excluded.current_activity
      `);
    }
    // Explicit ids don't advance the identity sequence; without this the next create would collide
    await tx.execute(sql`
      select setval(
        pg_get_serial_sequence('users', 'id'),
        (select max(id) from users),
        true
      )
    `);
  });

  // Verify from a fresh read, row by row, rather than trusting the writes
  const stored = await db
    .select()
    .from(users)
    .where(inArray(users.id, seed.map((user) => user.id)));
  const storedById = new Map(stored.map((row) => [row.id, row]));
  const problems: string[] = [];
  for (const user of seed) {
    const row = storedById.get(user.id);
    if (!row) {
      problems.push(`id ${user.id}: missing after import`);
      continue;
    }
    const wrong = differences(user, row);
    if (wrong.length > 0) {
      problems.push(`id ${user.id}: ${wrong.join(', ')} differ`);
    }
  }

  const [{ maxId }] = await db.select({ maxId: sql<number>`max(${users.id})::int` }).from(users);
  const sequence = await db.execute<{ last_value: string; is_called: boolean }>(
    sql`select last_value, is_called from users_id_seq`,
  );
  const { last_value: lastValue, is_called: isCalled } = sequence.rows[0]!;
  if (!isCalled || Number(lastValue) !== maxId) {
    problems.push(`id sequence is at ${lastValue} (called: ${isCalled}) but max(id) is ${maxId}`);
  }

  if (problems.length > 0) {
    console.error('Verification FAILED:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }
  console.log(
    `Imported and verified ${seed.length} users row by row. ` +
      `The id sequence is at ${lastValue}, so the next created user gets id ${maxId + 1}.`,
  );
} catch (error) {
  // A failed import rolls back completely; show the database's reason, not Drizzle's query dump
  const pgError = unwrapPgError(error);
  console.error('Import failed. The transaction was rolled back, so the database is unchanged.');
  console.error(`  ${pgError?.message ?? (error instanceof Error ? error.message.split('\n')[0] : String(error))}`);
  if (pgError?.detail) {
    console.error(`  ${pgError.detail}`);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
