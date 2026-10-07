import assert from 'node:assert/strict';
import test from 'node:test';

import bcrypt from 'bcrypt';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { createAuthRouter } from '../src/routes/auth.js';

const TEST_JWT_SECRET = 'test-jwt-secret';

function buildTestApp({ query, passwordHasher, jwtSigner, jwtSecret = TEST_JWT_SECRET }) {
  const authRouter = createAuthRouter({
    database: { query },
    passwordHasher: passwordHasher ?? bcrypt,
    jwtSigner,
    jwtSecret,
  });

  return createApp({ authRouter, logger: false });
}

test('returns a valid JWT and the user on successful login', async () => {
  const createdAt = new Date('2026-09-25T12:00:00.000Z');
  const passwordHash = await bcrypt.hash('secret-password', 4);
  const storedUser = {
    id: '0a5b230b-0f54-4a4b-8a5e-7c0c3c78a471',
    username: 'player',
    password_hash: passwordHash,
    created_at: createdAt,
  };

  const calls = [];
  const app = buildTestApp({
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rowCount: 1, rows: [storedUser] };
    },
    jwtSigner: {
      sign: (payload, secret, options) => {
        calls.push({ payload, secret, options });
        return 'signed.jwt.token';
      },
    },
  });

  const response = await request(app)
    .post('/auth/login')
    .send({ username: '  player  ', password: 'secret-password' });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'success');
  assert.equal(response.body.token, 'signed.jwt.token');
  assert.deepEqual(response.body.user, {
    id: storedUser.id,
    username: 'player',
    created_at: createdAt.toISOString(),
  });
  assert.equal('password_hash' in response.body.user, false);
  assert.match(calls[0].sql, /FROM users/);
  assert.deepEqual(calls[0].values, ['player']);
  assert.equal(calls[1].payload.sub, storedUser.id);
  assert.equal(calls[1].payload.username, 'player');
  assert.equal(calls[1].secret, TEST_JWT_SECRET);
  assert.equal(calls[1].options.expiresIn, '24h');
});

test('returns 401 when the user does not exist', async () => {
  const app = buildTestApp({
    query: async () => ({ rowCount: 0, rows: [] }),
    jwtSigner: {
      sign: () => {
        assert.fail('no token should be signed');
      },
    },
  });

  const response = await request(app)
    .post('/auth/login')
    .send({ username: 'ghost', password: 'secret-password' });

  assert.equal(response.status, 401);
  assert.equal(response.body.status, 'error');
});

test('returns 401 when the password does not match', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  const app = buildTestApp({
    query: async () => ({
      rowCount: 1,
      rows: [
        {
          id: '0a5b230b-0f54-4a4b-8a5e-7c0c3c78a471',
          username: 'player',
          password_hash: passwordHash,
          created_at: new Date(),
        },
      ],
    }),
    jwtSigner: {
      sign: () => {
        assert.fail('no token should be signed');
      },
    },
  });

  const response = await request(app)
    .post('/auth/login')
    .send({ username: 'player', password: 'wrong-password' });

  assert.equal(response.status, 401);
  assert.equal(response.body.status, 'error');
});

test('returns 400 when login fields are missing or invalid', async () => {
  const app = buildTestApp({
    query: async () => {
      assert.fail('the database should not be queried');
    },
  });

  const response = await request(app).post('/auth/login').send({});

  assert.equal(response.status, 400);
  assert.deepEqual(response.body.fields, ['username', 'password']);
});
