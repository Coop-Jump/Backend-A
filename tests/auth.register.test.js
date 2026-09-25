import assert from 'node:assert/strict';
import test from 'node:test';

import bcrypt from 'bcrypt';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { createAuthRouter } from '../src/routes/auth.js';

function buildTestApp({ query, hash }) {
  const authRouter = createAuthRouter({
    database: { query },
    passwordHasher: { hash },
    saltRounds: 4,
  });

  return createApp({ authRouter, logger: false });
}

test('registers a user with a bcrypt hash and returns 201', async () => {
  const calls = [];
  const createdAt = new Date('2026-09-25T12:00:00.000Z');
  const storedUser = {
    id: '0a5b230b-0f54-4a4b-8a5e-7c0c3c78a471',
    username: 'player',
    created_at: createdAt,
  };

  const app = buildTestApp({
    hash: async (password, saltRounds) => {
      calls.push({ type: 'hash', password, saltRounds });
      return bcrypt.hash(password, saltRounds);
    },
    query: async (sql, values) => {
      calls.push({ type: 'query', sql, values });
      return { rowCount: 1, rows: [storedUser] };
    },
  });

  const response = await request(app)
    .post('/auth/register')
    .send({ username: '  player  ', password: 'secret-password' });

  assert.equal(response.status, 201);
  assert.equal(response.body.status, 'success');
  assert.deepEqual(response.body.user, {
    id: storedUser.id,
    username: storedUser.username,
    created_at: createdAt.toISOString(),
  });
  assert.equal('password' in response.body.user, false);
  assert.equal('password_hash' in response.body.user, false);

  assert.equal(calls[0].type, 'hash');
  assert.equal(calls[0].password, 'secret-password');
  assert.equal(calls[0].saltRounds, 4);
  assert.equal(calls[1].type, 'query');
  assert.match(calls[1].sql, /ON CONFLICT \(username\) DO NOTHING/);
  assert.equal(calls[1].values[0], 'player');

  const storedHash = calls[1].values[1];
  assert.notEqual(storedHash, 'secret-password');
  assert.equal(await bcrypt.compare('secret-password', storedHash), true);
});

test('returns 400 when required fields are missing or invalid', async (context) => {
  const cases = [
    ['missing body fields', {}, ['username', 'password']],
    ['missing password', { username: 'player' }, ['password']],
    ['missing username', { password: 'secret-password' }, ['username']],
    ['empty username', { username: '', password: 'secret-password' }, ['username']],
    ['blank username', { username: '   ', password: 'secret-password' }, ['username']],
    ['blank password', { username: 'player', password: '   ' }, ['password']],
    ['non-string username', { username: 42, password: 'secret-password' }, ['username']],
    ['non-string password', { username: 'player', password: 42 }, ['password']],
  ];

  for (const [name, payload, expectedFields] of cases) {
    await context.test(name, async () => {
      const app = buildTestApp({
        hash: async () => {
          assert.fail('password should not be hashed');
        },
        query: async () => {
          assert.fail('the database should not be queried');
        },
      });

      const response = await request(app).post('/auth/register').send(payload);

      assert.equal(response.status, 400);
      assert.equal(response.body.status, 'error');
      assert.deepEqual(response.body.fields, expectedFields);
    });
  }
});

test('returns 400 when registration fields exceed their limits', async (context) => {
  const cases = [
    {
      name: 'username exceeds 50 characters',
      payload: { username: 'a'.repeat(51), password: 'secret-password' },
      field: 'username',
    },
    {
      name: 'password exceeds the bcrypt 72-byte limit',
      payload: { username: 'player', password: 'a'.repeat(73) },
      field: 'password',
    },
  ];

  for (const { name, payload, field } of cases) {
    await context.test(name, async () => {
      const app = buildTestApp({
        hash: async () => {
          assert.fail('password should not be hashed');
        },
        query: async () => {
          assert.fail('the database should not be queried');
        },
      });

      const response = await request(app).post('/auth/register').send(payload);

      assert.equal(response.status, 400);
      assert.deepEqual(response.body.fields, [field]);
    });
  }
});

test('returns 409 when the username already exists', async () => {
  const app = buildTestApp({
    hash: async (password) => `hashed:${password}`,
    query: async () => ({ rowCount: 0, rows: [] }),
  });

  const response = await request(app)
    .post('/auth/register')
    .send({ username: 'player', password: 'secret-password' });

  assert.equal(response.status, 409);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.message, 'Username already exists');
});

test('returns 409 when PostgreSQL reports a unique constraint violation', async () => {
  const app = buildTestApp({
    hash: async (password) => `hashed:${password}`,
    query: async () => {
      const error = new Error('duplicate key value violates unique constraint');
      error.code = '23505';
      throw error;
    },
  });

  const response = await request(app)
    .post('/auth/register')
    .send({ username: 'player', password: 'secret-password' });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, 'Username already exists');
});

test('returns 400 for malformed JSON', async () => {
  const app = buildTestApp({
    hash: async () => {
      assert.fail('password should not be hashed');
    },
    query: async () => {
      assert.fail('the database should not be queried');
    },
  });

  const response = await request(app)
    .post('/auth/register')
    .set('Content-Type', 'application/json')
    .send('{"username":');

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Invalid JSON body');
});
