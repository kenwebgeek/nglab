import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parseSeedFile } from '../src/scripts/seed.js';
import { createAdminPool, resetUsers } from './helpers.js';
import { getTestUrls } from './test-env.js';

const run = promisify(execFile);
const serverDir = fileURLToPath(new URL('..', import.meta.url));

const user = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  firstName: 'Tony',
  lastName: 'Stark',
  nickname: 'Iron Man',
  email: `user${id}@example.com`,
  currentActivity: 'Being a genius',
  ...overrides,
});

describe('parseSeedFile', () => {
  const parse = (users: unknown) => parseSeedFile(JSON.stringify({ users }));
  const issuesOf = (users: unknown) => {
    const result = parse(users);
    if (result.ok) throw new Error('Expected the seed to be invalid');
    return result.issues.map((issue) => issue.message);
  };

  it('accepts valid users, trimming text and turning blanks into null', () => {
    const result = parse([user(1, { firstName: '  Tony ', nickname: '  ', currentActivity: undefined })]);
    expect(result).toEqual({
      ok: true,
      users: [{ id: 1, firstName: 'Tony', lastName: 'Stark', nickname: null, email: 'user1@example.com', currentActivity: null }],
    });
  });

  it('reports every problem in the file, not just the first', () => {
    const issues = issuesOf([
      user(1),
      user(1, { firstName: 'T', email: 'USER1@example.com' }),
      user(3, { email: 'not-an-email' }),
      { firstName: 'No', lastName: 'Id', email: 'noid@example.com' },
    ]);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('First name must be at least 2 characters'),
        'duplicate id (also at index 0)',
        'duplicate email (also at index 0)',
        expect.stringContaining('Email must be a valid address'),
        expect.stringContaining('id must be a number'),
      ]),
    );
  });

  it.each([
    ['a string id', user(1, { id: '1' })],
    ['a zero id', user(1, { id: 0 })],
    ['a fractional id', user(1, { id: 1.5 })],
    ['an id beyond the integer range', user(1, { id: 2_147_483_648 })],
  ])('rejects %s', (_label, row) => {
    expect(parse([row]).ok).toBe(false);
  });

  it('rejects invalid JSON and a missing users array', () => {
    expect(parseSeedFile('{oops')).toMatchObject({ ok: false, issues: [{ message: 'File is not valid JSON' }] });
    expect(parseSeedFile('{"people":[]}')).toMatchObject({ ok: false, issues: [{ message: expect.stringContaining('"users" array') }] });
  });
});

describe('npm run db:seed (the import script, run against the test database)', () => {
  let admin: pg.Pool;
  let dir: string;

  beforeAll(async () => {
    admin = createAdminPool();
    dir = await mkdtemp(join(tmpdir(), 'nglab-seed-'));
  });

  afterAll(async () => {
    await admin.end();
    await rm(dir, { recursive: true, force: true });
  });

  beforeEach(() => resetUsers(admin));

  async function seed(users: unknown, ...flags: string[]) {
    const file = join(dir, 'seed.json');
    await writeFile(file, typeof users === 'string' ? users : JSON.stringify({ users }));
    try {
      const { stdout, stderr } = await run(
        process.execPath,
        ['--import', 'tsx', 'src/scripts/import-users.ts', '--file', file, ...flags],
        { cwd: serverDir, env: { ...process.env, MIGRATION_DATABASE_URL: getTestUrls().admin } },
      );
      return { code: 0, stdout, stderr };
    } catch (error) {
      const failure = error as { code: number; stdout: string; stderr: string };
      return { code: failure.code, stdout: failure.stdout, stderr: failure.stderr };
    }
  }

  const storedIds = async () => (await admin.query('select id from users order by id')).rows.map((row) => row.id);

  it('imports into an empty table, preserving ids, then resets the sequence so new users do not collide', async () => {
    const result = await seed([user(3), user(7), user(12)]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Imported and verified 3 users');
    expect(await storedIds()).toEqual([3, 7, 12]);

    const next = await admin.query("insert into users (first_name, last_name, email) values ('New', 'Person', 'new@example.com') returning id");
    expect(next.rows[0].id).toBe(13);
  });

  it('stores blank optional fields as NULL', async () => {
    await seed([user(1, { nickname: '', currentActivity: '  ' })]);
    const { rows } = await admin.query('select nickname, current_activity from users');
    expect(rows).toEqual([{ nickname: null, current_activity: null }]);
  });

  it('writes nothing on --dry-run', async () => {
    const result = await seed([user(1), user(2)], '--dry-run');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('would insert 2');
    expect(result.stdout).toContain('Dry run: nothing was written');
    expect(await storedIds()).toEqual([]);
  });

  it('refuses a non-empty table unless --upsert is given', async () => {
    await seed([user(1)]);
    const refused = await seed([user(1, { lastName: 'Changed' })]);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toContain('not empty');
    expect((await admin.query('select last_name from users')).rows[0].last_name).toBe('Stark');
  });

  it('updates matching ids and inserts the rest on --upsert, leaving other rows alone', async () => {
    await seed([user(1), user(2)]);
    await admin.query("insert into users (id, first_name, last_name, email) overriding system value values (50, 'Keep', 'Me', 'keep@example.com')");

    const result = await seed([user(1, { lastName: 'Changed' }), user(3)], '--upsert');
    expect(result.code).toBe(0);
    expect(await storedIds()).toEqual([1, 2, 3, 50]);
    expect((await admin.query('select last_name from users where id = 1')).rows[0].last_name).toBe('Changed');
  });

  it('is idempotent: re-running --upsert on identical data changes nothing', async () => {
    await seed([user(1), user(2)]);
    const again = await seed([user(1), user(2)], '--upsert');
    expect(again.code).toBe(0);
    expect(again.stdout).toContain('update 0 (2 already identical)');
  });

  it('rolls back everything when one row fails, and says why', async () => {
    await seed([user(1)]);
    const result = await seed([user(100), user(101, { email: 'USER1@example.com' })], '--upsert');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('rolled back');
    expect(result.stderr).toContain('users_email_unique');
    expect(await storedIds()).toEqual([1]);
  });

  it('rejects an invalid file without touching the database', async () => {
    const result = await seed([user(1), user(1, { email: 'other@example.com' }), user(2, { email: 'bad' })]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('duplicate id');
    expect(result.stderr).toContain('Email must be a valid address');
    expect(await storedIds()).toEqual([]);
  });
});
