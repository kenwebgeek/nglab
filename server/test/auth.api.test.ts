import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { call, createAdminPool, resetUsers, signIn, startServer, type TestServer } from './helpers.js';

let server: TestServer;
let admin: pg.Pool;

const api = (method: string, path: string, body?: unknown, headers?: Record<string, string>) =>
  call(server.baseUrl, method, path, body, headers);

const credentials = { email: 'ada@example.com', password: 'correct horse battery' };
const login = (body: unknown = credentials) => api('POST', '/auth/login', body);
const sessionCount = async () => (await admin.query('select count(*)::int as n from sessions')).rows[0].n as number;

beforeAll(async () => {
  admin = createAdminPool();
  server = await startServer(undefined, undefined, { realAuth: true });
});

afterAll(async () => {
  await server.close();
  await admin.end();
});

beforeEach(async () => {
  await resetUsers(admin);
  server.logs.length = 0;
});

describe('POST /auth/login', () => {
  it('signs in, returns the user and sets a hardened session cookie', async () => {
    await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
    const response = await login();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      firstName: 'Ada',
      lastName: 'Lovelace',
      nickname: '',
      email: 'ada@example.com',
      currentActivity: '',
      admin: false,
    });
    const cookie = response.headers.getSetCookie()[0]!;
    expect(cookie).toMatch(/^session=[\w-]{43};/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Expires=/);
    expect(response.text).not.toContain(credentials.password);
  });

  it('stores only a hash of the token', async () => {
    await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
    const response = await login();
    const token = response.headers.getSetCookie()[0]!.split(';')[0]!.slice('session='.length);

    const { rows } = await admin.query('select token_hash, user_id, expires_at from sessions');
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toContain(token);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].user_id).toBe(1);
    expect(rows[0].expires_at.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
  });

  it('matches the email case-insensitively', async () => {
    await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
    expect((await login({ ...credentials, email: '  ADA@Example.COM ' })).status).toBe(200);
  });

  it('gives every failure the same 401, whether the email, the password or the account is wrong', async () => {
    await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
    // A user created through the users API has no account
    await admin.query("insert into users (first_name, last_name, email) values ('Tony', 'Stark', 'tony@avengers.com')");

    const failures = [
      await login({ ...credentials, password: 'wrong password!' }),
      await login({ email: 'nobody@example.com', password: credentials.password }),
      await login({ email: 'tony@avengers.com', password: credentials.password }),
    ];
    for (const response of failures) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'invalid_credentials', message: 'Incorrect email or password' });
      expect(response.headers.getSetCookie()).toEqual([]);
    }
    expect(await sessionCount()).toBe(0);
  });

  it.each([
    ['an empty body', {}, ['email', 'password']],
    ['a missing password', { email: 'ada@example.com' }, ['password']],
    ['a non-string password', { email: 'ada@example.com', password: 123 }, ['password']],
    ['a very long password', { email: 'ada@example.com', password: 'x'.repeat(129) }, ['password']],
  ])('rejects %s with 400', async (_label, body, fields) => {
    const response = await login(body);
    expect(response.status).toBe(400);
    expect(response.body.issues.map((issue: { field: string }) => issue.field).sort()).toEqual(fields);
  });

  it('removes expired sessions when someone logs in', async () => {
    await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
    await admin.query(
      "insert into sessions (token_hash, user_id, expires_at) values ('stale', 1, now() - interval '1 day')",
    );
    await login();
    const { rows } = await admin.query('select token_hash from sessions');
    expect(rows.map((row) => row.token_hash)).not.toContain('stale');
    expect(rows).toHaveLength(1);
  });

  it('never logs the password or the session token', async () => {
    await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
    const response = await login();
    const token = response.headers.getSetCookie()[0]!.split(';')[0]!.slice('session='.length);
    await login({ ...credentials, password: 'wrong password!' });
    const logged = server.logs.join('\n');
    for (const secret of [credentials.password, 'wrong password!', token, credentials.email]) {
      expect(logged).not.toContain(secret);
    }
  });

  it('counts only failed attempts towards the rate limit', async () => {
    const limited = await startServer(undefined, undefined, {
      realAuth: true,
      loginRateLimit: { windowMs: 60_000, limit: 2 },
    });
    try {
      await call(limited.baseUrl, 'POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
      const attempt = (password: string) =>
        call(limited.baseUrl, 'POST', '/auth/login', { email: credentials.email, password });

      for (let i = 0; i < 3; i++) {
        expect((await attempt(credentials.password)).status).toBe(200);
      }
      expect((await attempt('wrong password!')).status).toBe(401);
      expect((await attempt('wrong password!')).status).toBe(401);
      const throttled = await attempt('wrong password!');
      expect(throttled.status).toBe(429);
      expect(throttled.body.error).toBe('too_many_requests');
    } finally {
      await limited.close();
    }
  });
});

describe('GET /auth/me', () => {
  it('returns the signed-in user', async () => {
    const cookie = await signIn(server.baseUrl, credentials);
    const response = await api('GET', '/auth/me', undefined, { cookie });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ email: 'ada@example.com', firstName: 'Ada' });
  });

  describe('authorization roles', () => {
    it('prevents ordinary users from managing others or changing roles', async () => {
      const cookie = await signIn(server.baseUrl, credentials);
      const otherCookie = await signIn(server.baseUrl, { email: 'other@example.com', password: credentials.password });
      const headers = { cookie };
      const own = (await api('GET', '/auth/me', undefined, headers)).body;
      const other = (await api('GET', '/auth/me', undefined, { cookie: otherCookie })).body;

      expect((await api('POST', '/users', { ...own, email: 'new@example.com' }, headers)).status).toBe(403);
      expect((await api('PUT', `/users/${other.id}`, other, headers)).status).toBe(403);
      expect((await api('DELETE', `/users/${other.id}`, undefined, headers)).status).toBe(403);
      expect((await api('PUT', `/users/${own.id}`, { ...own, admin: true }, headers)).status).toBe(403);
      const { admin: _admin, ...profile } = own;
      expect((await api('PUT', `/users/${own.id}`, { ...profile, firstName: 'Augusta' }, headers)).status).toBe(200);
      expect((await api('GET', '/auth/me', undefined, { cookie: otherCookie })).body).toEqual(other);
    });

    it('applies admin role changes immediately and preserves other users’ passwords', async () => {
      const adminCookie = await signIn(server.baseUrl, credentials);
      const otherCookie = await signIn(server.baseUrl, { email: 'other@example.com', password: credentials.password });
      await admin.query("update users set admin = true where email = 'ada@example.com'");
      const headers = { cookie: adminCookie };
      const other = (await api('GET', '/auth/me', undefined, { cookie: otherCookie })).body;
      const before = (await admin.query('select password_hash from accounts where user_id = $1', [other.id])).rows[0];
      const created = await api('POST', '/users', { ...validUserForRole(), admin: true }, headers);
      expect(created.status).toBe(201);
      expect(created.body.admin).toBe(true);

      const updated = await api('PUT', `/users/${other.id}`, {
        ...other, firstName: 'Grace', admin: true, password: 'attacker-chosen-password',
      }, headers);
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ firstName: 'Grace', admin: true });
      expect((await admin.query('select password_hash from accounts where user_id = $1', [other.id])).rows[0]).toEqual(before);
      expect((await api('GET', '/auth/me', undefined, { cookie: otherCookie })).body.admin).toBe(true);

      expect((await api('PUT', `/users/${other.id}`, { ...updated.body, admin: false }, headers)).body.admin).toBe(false);
      expect((await api('POST', '/users', validUserForRole(), { cookie: otherCookie })).status).toBe(403);
      expect((await api('DELETE', `/users/${created.body.id}`, undefined, headers)).status).toBe(200);
    });

    it('deletes an account, clears its cookie, and invalidates every session', async () => {
      const cookie = await signIn(server.baseUrl, credentials);
      const second = await login();
      const secondCookie = second.headers.getSetCookie()[0]!.split(';')[0]!;
      const response = await api('DELETE', '/users/1', undefined, { cookie });
      expect(response.status).toBe(200);
      expect(response.headers.getSetCookie()[0]).toMatch(/^session=;/);
      expect((await api('GET', '/auth/me', undefined, { cookie })).status).toBe(401);
      expect((await api('GET', '/auth/me', undefined, { cookie: secondCookie })).status).toBe(401);
      expect(await sessionCount()).toBe(0);
    });

    it('does not accept an admin role during public signup', async () => {
      const response = await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace', admin: true });
      expect(response.status).toBe(201);
      expect(response.body.admin).toBe(false);
    });
  });

  function validUserForRole() {
    return { firstName: 'Tony', lastName: 'Stark', email: 'tony@example.com' };
  }

  it.each([
    ['no cookie', undefined],
    ['an unknown token', 'session=not-a-real-token'],
    ['an empty token', 'session='],
    ['another cookie only', 'theme=dark'],
  ])('is 401 with %s', async (_label, cookie) => {
    const response = await api('GET', '/auth/me', undefined, cookie ? { cookie } : {});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('unauthenticated');
  });

  it('is 401 once the session has expired', async () => {
    const expiring = await startServer(undefined, undefined, { realAuth: true, sessionTtlMs: -1000 });
    try {
      const cookie = await signIn(expiring.baseUrl, credentials);
      const response = await call(expiring.baseUrl, 'GET', '/auth/me', undefined, { cookie });
      expect(response.status).toBe(401);
    } finally {
      await expiring.close();
    }
  });

  it('is 401 after the user is deleted', async () => {
    const cookie = await signIn(server.baseUrl, credentials);
    await admin.query('delete from users');
    expect((await api('GET', '/auth/me', undefined, { cookie })).status).toBe(401);
    expect(await sessionCount()).toBe(0);
  });
});

describe('PUT /auth/password', () => {
  it('changes the password after verifying the current password', async () => {
    const firstCookie = await signIn(server.baseUrl, credentials);
    const secondCookie = (await login()).headers.getSetCookie()[0]!.split(';')[0]!;
    const response = await api('PUT', '/auth/password', {
      currentPassword: credentials.password,
      newPassword: 'new secure password 2!',
    }, { cookie: firstCookie });

    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()[0]).toMatch(/^session=;.*Expires=Thu, 01 Jan 1970/);
    expect(await sessionCount()).toBe(0);
    expect((await api('GET', '/auth/me', undefined, { cookie: firstCookie })).status).toBe(401);
    expect((await api('GET', '/auth/me', undefined, { cookie: secondCookie })).status).toBe(401);
    expect((await login(credentials)).status).toBe(401);
    expect((await login({ ...credentials, password: 'new secure password 2!' })).status).toBe(200);
  });

  it('rejects a wrong current password without changing it', async () => {
    const cookie = await signIn(server.baseUrl, credentials);
    const response = await api('PUT', '/auth/password', {
      currentPassword: 'wrong password!',
      newPassword: 'new secure password 2!',
    }, { cookie });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_current_password');
    expect(await sessionCount()).toBe(1);
    expect((await api('GET', '/auth/me', undefined, { cookie })).status).toBe(200);
    expect((await login(credentials)).status).toBe(200);
  });

  it.each([
    [{ currentPassword: '', newPassword: 'new secure password 2!' }, 'currentPassword'],
    [{ currentPassword: credentials.password, newPassword: 'short1!' }, 'newPassword'],
    [{ currentPassword: credentials.password, newPassword: 'long password without number!' }, 'newPassword'],
    [{ currentPassword: credentials.password, newPassword: 'longpasswordwithout2ymbol' }, 'newPassword'],
  ])('validates the password payload', async (body, field) => {
    const cookie = await signIn(server.baseUrl, credentials);
    const response = await api('PUT', '/auth/password', body, { cookie });

    expect(response.status).toBe(400);
    expect(response.body.issues.map((issue: { field: string }) => issue.field)).toContain(field);
  });

  it('requires a session', async () => {
    const response = await api('PUT', '/auth/password', {
      currentPassword: credentials.password,
      newPassword: 'new secure password 2!',
    });

    expect(response.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('ends the session and clears the cookie', async () => {
    const cookie = await signIn(server.baseUrl, credentials);
    const response = await api('POST', '/auth/logout', undefined, { cookie });

    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()[0]).toMatch(/^session=;.*Expires=Thu, 01 Jan 1970/);
    expect(await sessionCount()).toBe(0);
    // The old cookie no longer works, even if a client keeps sending it
    expect((await api('GET', '/auth/me', undefined, { cookie })).status).toBe(401);
  });

  it('only ends the session it was called with', async () => {
    const first = await signIn(server.baseUrl, credentials);
    const second = (await login()).headers.getSetCookie()[0]!.split(';')[0]!;
    await api('POST', '/auth/logout', undefined, { cookie: first });
    expect((await api('GET', '/auth/me', undefined, { cookie: second })).status).toBe(200);
  });

  it('is fine without a session', async () => {
    expect((await api('POST', '/auth/logout')).status).toBe(204);
  });
});

describe('protected routes', () => {
  it.each([
    ['GET', '/users'],
    ['POST', '/users'],
    ['PUT', '/users/1'],
    ['PUT', '/auth/password'],
    ['DELETE', '/users/1'],
  ])('%s %s needs a session', async (method, path) => {
    const response = await api(method, path, method === 'GET' || method === 'DELETE' ? undefined : {});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('unauthenticated');
  });

  it('serves the users API to a signed-in user', async () => {
    const cookie = await signIn(server.baseUrl, credentials);
    const response = await api('GET', '/users', undefined, { cookie });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('keeps health and sign-up public', async () => {
    expect((await api('GET', '/health')).status).toBe(200);
    expect((await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' })).status).toBe(201);
  });
});

describe('cross-origin requests', () => {
  it('allows credentialed requests from the configured origin only', async () => {
    const response = await api('GET', '/health', undefined, { origin: 'http://evil.example' });
    // A fixed origin is never echoed back, so a browser on another origin cannot read the response
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:4200');
    expect(response.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('refuses state-changing requests from another origin', async () => {
    await api('POST', '/accounts', { ...credentials, firstName: 'Ada', lastName: 'Lovelace' });
    const response = await api('POST', '/auth/login', credentials, { origin: 'http://evil.example' });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('forbidden_origin');
    expect(await sessionCount()).toBe(0);

    expect((await api('POST', '/auth/login', credentials, { origin: 'http://localhost:4200' })).status).toBe(200);
  });
});
