import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { call, createAdminPool, resetUsers, startServer, validUser, type TestServer } from './helpers.js';
import { getTestUrls } from './test-env.js';

let server: TestServer;
let admin: pg.Pool;

const api = (method: string, path: string, body?: unknown, headers?: Record<string, string>) =>
  call(server.baseUrl, method, path, body, headers);

async function countUsers(): Promise<number> {
  const { rows } = await admin.query('select count(*)::int as n from users');
  return rows[0].n;
}

const create = async (overrides: Record<string, unknown> = {}) => {
  const response = await api('POST', '/users', { ...validUser, ...overrides });
  expect(response.status).toBe(201);
  return response.body;
};

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

describe('GET /users', () => {
  it('returns an empty array when there are no users', async () => {
    const response = await api('GET', '/users');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns users ordered by id, with blank optional fields as empty strings', async () => {
    const first = await create({ email: 'one@example.com' });
    const second = await create({ email: 'two@example.com', nickname: '', currentActivity: null });
    // Updating the first user must not change the order
    await api('PUT', `/users/${first.id}`, { ...validUser, email: 'one@example.com', lastName: 'Changed' });

    const response = await api('GET', '/users');
    expect(response.body.map((user: { id: number }) => user.id)).toEqual([first.id, second.id]);
    expect(response.body[1]).toEqual({
      id: second.id,
      firstName: 'Tony',
      lastName: 'Stark',
      nickname: '',
      email: 'two@example.com',
      currentActivity: '',
    });
  });
});

describe('POST /users', () => {
  it('creates a user, returns 201 and lets the database assign the id', async () => {
    const response = await api('POST', '/users', validUser);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 1, ...validUser });
  });

  it("ignores any id in the body, including the form's empty string", async () => {
    const withEmpty = await api('POST', '/users', { ...validUser, id: '' });
    const withNumber = await api('POST', '/users', { ...validUser, id: 999, email: 'other@example.com' });
    expect([withEmpty.body.id, withNumber.body.id]).toEqual([1, 2]);
  });

  it('accepts the payload the Angular form sends (null optional fields)', async () => {
    const response = await api('POST', '/users', {
      id: '',
      firstName: 'Tony',
      lastName: 'Stark',
      nickname: null,
      email: 'tony@avengers.com',
      currentActivity: null,
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ nickname: '', currentActivity: '' });
  });

  it('trims whitespace from every text field', async () => {
    const response = await api('POST', '/users', {
      firstName: '  Tony ',
      lastName: ' Stark  ',
      nickname: '  Iron Man ',
      email: '  tony@avengers.com ',
      currentActivity: ' Being a genius  ',
    });
    expect(response.body).toEqual({ id: 1, ...validUser });
  });

  it('stores blank optional fields as NULL but returns empty strings', async () => {
    await api('POST', '/users', { ...validUser, nickname: '   ', currentActivity: undefined });
    const { rows } = await admin.query('select nickname, current_activity from users');
    expect(rows).toEqual([{ nickname: null, current_activity: null }]);
  });

  it.each([
    ['a missing first name', { firstName: undefined }, 'firstName'],
    ['a one-character first name', { firstName: 'T' }, 'firstName'],
    ['a whitespace-only last name', { lastName: '   ' }, 'lastName'],
    ['a 101-character first name', { firstName: 'x'.repeat(101) }, 'firstName'],
    ['a 101-character nickname', { nickname: 'x'.repeat(101) }, 'nickname'],
    ['a 201-character current activity', { currentActivity: 'x'.repeat(201) }, 'currentActivity'],
    ['a missing email', { email: undefined }, 'email'],
    ['a malformed email', { email: 'not-an-email' }, 'email'],
    ['an email over 254 characters', { email: `${'a'.repeat(250)}@b.co` }, 'email'],
    ['a non-string first name', { firstName: 123 }, 'firstName'],
  ])('rejects %s with a 400 that names the field', async (_label, override, field) => {
    const response = await api('POST', '/users', { ...validUser, ...override });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
    expect(response.body.issues.map((issue: { field: string }) => issue.field)).toContain(field);
    expect(await countUsers()).toBe(0);
  });

  it('reports every invalid field at once', async () => {
    const response = await api('POST', '/users', { firstName: 'A', lastName: '', email: 'nope' });
    expect(response.body.issues.map((issue: { field: string }) => issue.field)).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email']),
    );
  });

  it('rejects a duplicate email with a 409, ignoring case', async () => {
    await create();
    const exact = await api('POST', '/users', { ...validUser, firstName: 'Toni' });
    const differentCase = await api('POST', '/users', { ...validUser, firstName: 'Toni', email: 'TONY@Avengers.COM' });

    expect(exact.status).toBe(409);
    expect(differentCase.status).toBe(409);
    expect(differentCase.body.error).toBe('email_taken');
    expect(await countUsers()).toBe(1);
  });

  it.each([
    ['malformed JSON', '{"firstName":', 400, 'invalid_json'],
    ['a JSON array', '[]', 400, 'validation_error'],
    ['a body over 10 KB', JSON.stringify({ ...validUser, padding: 'x'.repeat(12_000) }), 413, 'payload_too_large'],
  ])('rejects %s', async (_label, raw, status, code) => {
    const response = await api('POST', '/users', raw);
    expect(response.status).toBe(status);
    expect(response.body.error).toBe(code);
  });

  it('rejects a request with no JSON body', async () => {
    const response = await api('POST', '/users');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });
});

describe('PUT /users/:id', () => {
  it('replaces every field and returns the updated user', async () => {
    const user = await create();
    const response = await api('PUT', `/users/${user.id}`, {
      firstName: 'Anthony',
      lastName: 'Stark',
      nickname: '',
      email: 'tony@avengers.com',
      currentActivity: 'Retired',
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: user.id,
      firstName: 'Anthony',
      lastName: 'Stark',
      nickname: '',
      email: 'tony@avengers.com',
      currentActivity: 'Retired',
    });
  });

  it('lets the path id win over an id in the body', async () => {
    const user = await create();
    const response = await api('PUT', `/users/${user.id}`, { ...validUser, id: 999 });
    expect(response.body.id).toBe(user.id);
    const { rows } = await admin.query('select id from users order by id');
    expect(rows).toEqual([{ id: user.id }]);
  });

  it('advances updated_at but leaves created_at alone', async () => {
    const user = await create();
    const before = (await admin.query('select created_at, updated_at from users where id = $1', [user.id])).rows[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
    await api('PUT', `/users/${user.id}`, { ...validUser, nickname: 'Changed' });
    const after = (await admin.query('select created_at, updated_at from users where id = $1', [user.id])).rows[0];

    expect(after.updated_at.getTime()).toBeGreaterThan(before.updated_at.getTime());
    expect(after.created_at.getTime()).toBe(before.created_at.getTime());
  });

  it("returns 403 for an id other than the signed-in user", async () => {
    const response = await api('PUT', '/users/2147483647', validUser);
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('forbidden');
  });

  it('rejects an email that belongs to another user with a 409, ignoring case', async () => {
    const current = await create({ email: 'first@example.com' });
    await create({ email: 'second@example.com' });
    const response = await api('PUT', `/users/${current.id}`, { ...validUser, email: 'SECOND@example.com' });
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('email_taken');
  });

  it('does not allow the signed-in user to update another profile', async () => {
    const current = await create();
    const other = await create({ email: 'other@example.com' });
    const response = await api('PUT', `/users/${other.id}`, { ...validUser, email: other.email });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('forbidden');
    expect((await api('GET', '/users')).body).toEqual([
      current,
      other,
    ]);
  });

  it('lets a user keep their own email, even with different case', async () => {
    const user = await create();
    const response = await api('PUT', `/users/${user.id}`, { ...validUser, email: 'TONY@AVENGERS.COM' });
    expect(response.status).toBe(200);
    expect(response.body.email).toBe('TONY@AVENGERS.COM');
  });

  it('validates the body', async () => {
    const user = await create();
    const response = await api('PUT', `/users/${user.id}`, { ...validUser, firstName: 'T' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation_error');
  });

  it.each(['abc', '0', '-1', '1.5', '1e3', '99999999999'])('rejects the id "%s" with a 400', async (id) => {
    const response = await api('PUT', `/users/${id}`, validUser);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_id');
  });
});

describe('DELETE /users/:id', () => {
  it('deletes the user and returns an empty object, leaving other users alone', async () => {
    const keep = await create({ email: 'keep@example.com' });
    const remove = await create({ email: 'remove@example.com' });

    const response = await api('DELETE', `/users/${remove.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
    expect((await api('GET', '/users')).body).toEqual([keep]);
  });

  it('returns 404 when the user is already gone', async () => {
    const user = await create();
    await api('DELETE', `/users/${user.id}`);
    const again = await api('DELETE', `/users/${user.id}`);
    expect(again.status).toBe(404);
    expect(again.body.error).toBe('not_found');
  });

  it.each(['abc', '0', '-1', '99999999999'])('rejects the id "%s" with a 400', async (id) => {
    const response = await api('DELETE', `/users/${id}`);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_id');
  });

  it('frees the email so it can be used again', async () => {
    const user = await create();
    await api('DELETE', `/users/${user.id}`);
    expect((await api('POST', '/users', validUser)).status).toBe(201);
  });
});

describe('everything else', () => {
  it('reports healthy when the database is reachable', async () => {
    const response = await api('GET', '/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a JSON 404 for unknown routes and methods', async () => {
    expect((await api('GET', '/nope')).body.error).toBe('not_found');
    expect((await api('PATCH', '/users/1', {})).status).toBe(404);
  });

  it('allows the Angular origin, with its methods and headers, and no other', async () => {
    const preflight = await api('OPTIONS', '/users', undefined, {
      origin: 'http://localhost:4200',
      'access-control-request-method': 'PUT',
      'access-control-request-headers': 'content-type',
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:4200');
    expect(preflight.headers.get('access-control-allow-methods')).toBe('GET,POST,PUT,DELETE');
    expect(preflight.headers.get('access-control-allow-headers')).toBe('content-type');

    // The header always names the configured origin, so a browser on another origin is blocked
    const other = await api('GET', '/users', undefined, { origin: 'http://evil.example' });
    expect(other.headers.get('access-control-allow-origin')).toBe('http://localhost:4200');
  });

  it('does not advertise the framework', async () => {
    expect((await api('GET', '/health')).headers.get('x-powered-by')).toBeNull();
  });

  it('logs requests without user data or query strings', async () => {
    await api('POST', '/users', { ...validUser, firstName: 'Zebulon', email: 'zebulon@secret.example' });
    await api('GET', '/users?email=zebulon@secret.example');

    const logged = server.logs.join('\n');
    expect(logged).toContain('"method":"POST"');
    expect(logged).toContain('"url":"/users"');
    expect(logged).not.toMatch(/zebulon|secret\.example/i);
  });
});

describe('when the database fails', () => {
  it('returns a generic 500 and logs no user data (Drizzle error messages embed the query parameters)', async () => {
    const wrongPassword = new URL(getTestUrls().app);
    wrongPassword.password = 'definitely-wrong';
    const broken = await startServer(wrongPassword.toString());
    try {
      const response = await call(broken.baseUrl, 'POST', '/users', {
        ...validUser,
        firstName: 'Piiname',
        email: 'pii-leak-test@example.com',
      });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'internal_error', message: 'Something went wrong' });

      const logged = broken.logs.join('\n');
      expect(logged).toContain('Unhandled error');
      expect(logged).toContain('28P01');
      expect(logged).not.toMatch(/piiname|pii-leak-test/i);

      expect((await call(broken.baseUrl, 'GET', '/health')).status).toBe(503);
    } finally {
      await broken.close();
    }
  });
});
