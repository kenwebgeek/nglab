import type pg from 'pg';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdminPool, createAppPool, resetUsers } from './helpers.js';

// These run as the least-privilege app role, exactly as the API does, against the migrated schema.
let app: pg.Pool;
let admin: pg.Pool;

beforeAll(() => {
  app = createAppPool();
  admin = createAdminPool();
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

beforeEach(() => resetUsers(admin));

const insert = (
  firstName: string | null,
  lastName: string,
  email: string,
  nickname: string | null = null,
  currentActivity: string | null = null,
) =>
  app.query(
    'insert into users (first_name, last_name, email, nickname, current_activity) values ($1, $2, $3, $4, $5) returning *',
    [firstName, lastName, email, nickname, currentActivity],
  );

async function pgError(promise: Promise<unknown>): Promise<{ code?: string; constraint?: string }> {
  try {
    await promise;
  } catch (error) {
    return error as { code?: string; constraint?: string };
  }
  throw new Error('Expected the query to fail, but it succeeded');
}

describe('users table constraints', () => {
  it('initializes the requested existing admin without elevating other users', async () => {
    const client = await admin.connect();
    try {
      await client.query('begin');
      await client.query('create temporary table users (email citext not null)');
      await client.query(
        'insert into users (email) values ($1), ($2)',
        ['KENREYNOLDS78@ICLOUD.COM', 'other@example.com'],
      );
      const migration = await readFile(new URL('../drizzle/0007_lucky_eddie_brock.sql', import.meta.url), 'utf8');
      await client.query(migration);
      const { rows } = await client.query('select email, admin from users order by email');
      expect(rows).toEqual([
        { email: 'KENREYNOLDS78@ICLOUD.COM', admin: true },
        { email: 'other@example.com', admin: false },
      ]);
    } finally {
      await client.query('rollback');
      client.release();
    }
  });

  it('assigns ids from an identity column and keeps NULL optional fields', async () => {
    const { rows } = await insert('Tony', 'Stark', 'tony@avengers.com');
    expect(rows[0]).toMatchObject({ id: 1, nickname: null, current_activity: null });
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });

  it('rejects an explicit id, because the identity is GENERATED ALWAYS', async () => {
    const error = await pgError(
      app.query("insert into users (id, first_name, last_name, email) values (99, 'Tony', 'Stark', 'a@b.co')"),
    );
    expect(error.code).toBe('428C9');
  });

  it('enforces a case-insensitive unique email', async () => {
    await insert('Tony', 'Stark', 'tony@avengers.com');
    const error = await pgError(insert('Toni', 'Stark', 'TONY@Avengers.COM'));
    expect(error).toMatchObject({ code: '23505', constraint: 'users_email_unique' });
  });

  it('requires first name, last name and email', async () => {
    expect((await pgError(insert(null, 'Stark', 'a@b.co'))).code).toBe('23502');
    expect((await pgError(app.query("insert into users (first_name, last_name) values ('Tony', 'Stark')"))).code).toBe('23502');
  });

  it.each([
    ['a 1-character first name', ['T', 'Stark', 'a@b.co'], 'users_first_name_length'],
    ['a whitespace-only last name', ['Tony', '   ', 'a@b.co'], 'users_last_name_length'],
    ['a 101-character first name', ['x'.repeat(101), 'Stark', 'a@b.co'], 'users_first_name_length'],
    ['an empty-string nickname (blank must be NULL)', ['Tony', 'Stark', 'a@b.co', ''], 'users_nickname_length'],
    ['a 101-character nickname', ['Tony', 'Stark', 'a@b.co', 'x'.repeat(101)], 'users_nickname_length'],
    ['a 201-character current activity', ['Tony', 'Stark', 'a@b.co', null, 'x'.repeat(201)], 'users_current_activity_length'],
    ['a 2-character email', ['Tony', 'Stark', 'a@'], 'users_email_length'],
    ['an email over 254 characters', ['Tony', 'Stark', `${'a'.repeat(250)}@b.co`], 'users_email_length'],
  ] as const)('rejects %s with a CHECK violation', async (_label, values, constraint) => {
    const [firstName, lastName, email, nickname, currentActivity] = values as unknown as [
      string, string, string, (string | null)?, (string | null)?,
    ];
    const error = await pgError(insert(firstName, lastName, email, nickname ?? null, currentActivity ?? null));
    expect(error).toMatchObject({ code: '23514', constraint });
  });
});

describe('accounts table constraints', () => {
  const insertUser = async (email = 'ada@example.com') => (await insert('Ada', 'Lovelace', email)).rows[0].id as number;
  const insertAccount = (userId: number, hash = 'scrypt$hash') =>
    app.query('insert into accounts (user_id, password_hash) values ($1, $2) returning *', [userId, hash]);

  it('allows one account per user', async () => {
    const id = await insertUser();
    await insertAccount(id);
    expect(await pgError(insertAccount(id))).toMatchObject({ code: '23505', constraint: 'accounts_pkey' });
  });

  it('requires an existing user', async () => {
    expect(await pgError(insertAccount(999))).toMatchObject({ code: '23503', constraint: 'accounts_user_id_users_id_fk' });
  });

  it('rejects an empty password hash with a CHECK violation', async () => {
    const id = await insertUser();
    expect(await pgError(insertAccount(id, ''))).toMatchObject({ code: '23514', constraint: 'accounts_password_hash_not_empty' });
  });

  it('is deleted together with its user', async () => {
    const id = await insertUser();
    await insertAccount(id);
    await app.query('delete from users where id = $1', [id]);
    expect((await app.query('select 1 from accounts')).rowCount).toBe(0);
  });

  it('advances updated_at on UPDATE', async () => {
    const { rows } = await insertAccount(await insertUser());
    await new Promise((resolve) => setTimeout(resolve, 25));
    const updated = await app.query("update accounts set password_hash = 'scrypt$new' where user_id = $1 returning updated_at", [rows[0].user_id]);
    expect(updated.rows[0].updated_at.getTime()).toBeGreaterThan(rows[0].updated_at.getTime());
  });
});

describe('updated_at trigger', () => {
  it('advances updated_at on UPDATE and leaves created_at alone', async () => {
    const { rows } = await insert('Tony', 'Stark', 'tony@avengers.com');
    await new Promise((resolve) => setTimeout(resolve, 25));
    const updated = await app.query("update users set nickname = 'Iron Man' where id = $1 returning created_at, updated_at", [
      rows[0].id,
    ]);
    expect(updated.rows[0].updated_at.getTime()).toBeGreaterThan(rows[0].updated_at.getTime());
    expect(updated.rows[0].created_at.getTime()).toBe(rows[0].created_at.getTime());
  });

  it('overrides an updated_at supplied by the client', async () => {
    const { rows } = await insert('Tony', 'Stark', 'tony@avengers.com');
    const updated = await app.query("update users set updated_at = '2000-01-01' where id = $1 returning updated_at", [rows[0].id]);
    expect(updated.rows[0].updated_at.getFullYear()).toBeGreaterThan(2000);
  });
});

describe('app role privileges', () => {
  it('can read, insert, update and delete users', async () => {
    const { rows } = await insert('Tony', 'Stark', 'tony@avengers.com');
    await app.query("update users set last_name = 'Starks' where id = $1", [rows[0].id]);
    const deleted = await app.query('delete from users where id = $1', [rows[0].id]);
    expect(deleted.rowCount).toBe(1);
  });

  it.each([
    ['create a table', 'create table t (i int)'],
    ['alter users', 'alter table users add column x int'],
    ['drop users', 'drop table users'],
    ['truncate users', 'truncate users'],
    ['create a role', 'create role intruder'],
  ])('cannot %s', async (_label, statement) => {
    expect((await pgError(app.query(statement))).code).toBe('42501');
  });
});
