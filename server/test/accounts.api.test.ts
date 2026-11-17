import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/accounts/password.js';
import { createAccountsRepository } from '../src/accounts/repository.js';
import * as schema from '../src/db/schema.js';
import { call, createAdminPool, createAppPool, resetUsers, startServer, validUser, type TestServer } from './helpers.js';

let server: TestServer;
let admin: pg.Pool;

const signup = (body: unknown) => call(server.baseUrl, 'POST', '/accounts', body);
const valid = {
  email: 'ada@example.com',
  password: 'correct horse battery',
  firstName: 'Ada',
  lastName: 'Lovelace',
  nickname: 'Countess',
};
const count = async (table: 'users' | 'accounts') =>
  (await admin.query(`select count(*)::int as n from ${table}`)).rows[0].n as number;

beforeAll(async () => {
  admin = createAdminPool();
  server = await startServer();
});

afterAll(async () => {
  await server.close();
  await admin.end();
});

beforeEach(async () => {
  await resetUsers(admin);
  server.logs.length = 0;
});

describe('password hashing', () => {
  it('verifies the right password, rejects the wrong one and salts every hash', async () => {
    const first = await hashPassword('correct horse battery');
    const second = await hashPassword('correct horse battery');
    expect(first).not.toBe(second);
    expect(await verifyPassword('correct horse battery', first)).toBe(true);
    expect(await verifyPassword('wrong horse battery', first)).toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('anything', 'plaintext')).toBe(false);
    expect(await verifyPassword('anything', 'bcrypt$1$2$3$4$5')).toBe(false);
  });
});

describe('POST /accounts', () => {
  it('creates a user with credentials and returns the user, never the password', async () => {
    const response = await signup(valid);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      nickname: 'Countess',
      email: 'ada@example.com',
      currentActivity: '',
    });
    expect(response.text).not.toContain(valid.password);
    expect(response.text).not.toContain('scrypt');
  });

  it('lists the new user in GET /users', async () => {
    await signup(valid);
    const response = await call(server.baseUrl, 'GET', '/users');
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ email: 'ada@example.com', firstName: 'Ada' });
  });

  it('stores a hash for that user, never the password', async () => {
    const { body } = await signup(valid);
    const { rows } = await admin.query('select user_id, password_hash from accounts');
    expect(rows[0].user_id).toBe(body.id);
    expect(rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(rows[0].password_hash).not.toContain(valid.password);
    expect(await verifyPassword(valid.password, rows[0].password_hash)).toBe(true);
  });

  it('trims the profile fields but not the password', async () => {
    const response = await signup({
      ...valid,
      email: '  ada@example.com  ',
      firstName: ' Ada ',
      password: '  spaced password  ',
    });
    expect(response.body).toMatchObject({ email: 'ada@example.com', firstName: 'Ada' });
    const { rows } = await admin.query('select password_hash from accounts');
    expect(await verifyPassword('  spaced password  ', rows[0].password_hash)).toBe(true);
  });

  it.each([
    ['omitted', undefined],
    ['blank', '   '],
    ['null', null],
  ])('stores a %s nickname as NULL and returns it as an empty string', async (_label, nickname) => {
    const response = await signup({ ...valid, nickname });
    expect(response.status).toBe(201);
    expect(response.body.nickname).toBe('');
    expect((await admin.query('select nickname from users')).rows[0].nickname).toBeNull();
  });

  it('ignores an id and a current activity sent by the client', async () => {
    const response = await signup({ ...valid, id: 99, currentActivity: 'Hacking' });
    expect(response.body.id).toBe(1);
    expect(response.body.currentActivity).toBe('');
  });

  it('rejects a duplicate email regardless of case with 409, creating nothing', async () => {
    await signup(valid);
    const response = await signup({ ...valid, email: 'ADA@Example.com', firstName: 'Other' });
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('email_taken');
    expect(await count('users')).toBe(1);
    expect(await count('accounts')).toBe(1);
  });

  it('rejects an email that already belongs to a user without an account', async () => {
    const created = await call(server.baseUrl, 'POST', '/users', { ...validUser, email: valid.email });
    expect(created.status).toBe(201);
    const response = await signup(valid);
    expect(response.status).toBe(409);
    expect(await count('accounts')).toBe(0);
  });

  it.each([
    ['an empty body', {}, ['email', 'firstName', 'lastName', 'password']],
    ['an invalid email', { ...valid, email: 'not-an-email' }, ['email']],
    ['an email over 254 characters', { ...valid, email: `${'a'.repeat(250)}@b.co` }, ['email']],
    ['a password under 8 characters', { ...valid, password: 'short' }, ['password']],
    ['a password over 128 characters', { ...valid, password: 'x'.repeat(129) }, ['password']],
    ['a non-string password', { ...valid, password: 12345678 }, ['password']],
    ['a 1-character first name', { ...valid, firstName: 'A' }, ['firstName']],
    ['a missing last name', { ...valid, lastName: undefined }, ['lastName']],
    ['a whitespace-only last name', { ...valid, lastName: '   ' }, ['lastName']],
    ['a 101-character first name', { ...valid, firstName: 'x'.repeat(101) }, ['firstName']],
    ['a 101-character nickname', { ...valid, nickname: 'x'.repeat(101) }, ['nickname']],
  ])('rejects %s with 400, creating nothing', async (_label, body, fields) => {
    const response = await signup(body);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
    expect(response.body.issues.map((issue: { field: string }) => issue.field).sort()).toEqual(fields);
    expect(await count('users')).toBe(0);
    expect(await count('accounts')).toBe(0);
  });

  it('never logs the profile or the password', async () => {
    await signup(valid);
    await signup(valid);
    const logged = server.logs.join('\n');
    for (const secret of [valid.password, valid.email, valid.firstName, valid.lastName, valid.nickname]) {
      expect(logged).not.toContain(secret);
    }
  });

  it('throttles repeated signups from one client', async () => {
    const limited = await startServer(undefined, { windowMs: 60_000, limit: 2 });
    try {
      const attempt = () => call(limited.baseUrl, 'POST', '/accounts', { email: 'bad', password: 'x' });
      expect((await attempt()).status).toBe(400);
      expect((await attempt()).status).toBe(400);
      const response = await attempt();
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('too_many_requests');
    } finally {
      await limited.close();
    }
  });
});

describe('account creation atomicity', () => {
  it('leaves no user behind when the credentials cannot be stored', async () => {
    const pool = createAppPool();
    try {
      const repository = createAccountsRepository(drizzle({ client: pool, schema }));
      const { password: _password, ...profile } = valid;
      // The empty hash violates accounts_password_hash_not_empty after the user row was inserted
      await expect(repository.create(profile, '')).rejects.toThrow();
      expect(await count('users')).toBe(0);
    } finally {
      await pool.end();
    }
  });
});

describe('deleting a user', () => {
  it('deletes their account too', async () => {
    const { body } = await signup(valid);
    const response = await call(server.baseUrl, 'DELETE', `/users/${body.id}`);
    expect(response.status).toBe(200);
    expect(await count('accounts')).toBe(0);
  });
});
