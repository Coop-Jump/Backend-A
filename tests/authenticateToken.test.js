import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

import { createAuthenticateToken } from '../src/middleware/authenticateToken.js';

const TEST_JWT_SECRET = 'test-jwt-secret';

function buildTestApp({ verify } = {}) {
  const app = express();
  const authenticateToken = createAuthenticateToken({
    jwtVerifier: verify ? { verify } : undefined,
    jwtSecret: TEST_JWT_SECRET,
  });

  app.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({ status: 'success', user: req.user });
  });

  return app;
}

test('passes the decoded user in req.user for a valid token', async () => {
  const payload = { sub: 'user-id-1', username: 'player' };
  const app = buildTestApp({
    verify: (token, secret) => {
      assert.equal(secret, TEST_JWT_SECRET);
      assert.equal(token, 'valid-token');
      return payload;
    },
  });

  const response = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer valid-token');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user, payload);
});

test('returns 401 when the Authorization header is missing or malformed', async (context) => {
  const cases = [
    ['missing header', undefined],
    ['wrong scheme', 'Basic abc123'],
    ['empty bearer token', 'Bearer '],
  ];

  for (const [name, header] of cases) {
    await context.test(name, async () => {
      const app = buildTestApp({
        verify: () => {
          assert.fail('token should not be verified');
        },
      });

      const req = request(app).get('/protected');
      if (header !== undefined) {
        req.set('Authorization', header);
      }

      const response = await req;
      assert.equal(response.status, 401);
      assert.equal(response.body.status, 'error');
    });
  }
});

test('returns 403 when the token is invalid or expired', async () => {
  const app = buildTestApp({
    verify: () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      throw error;
    },
  });

  const response = await request(app)
    .get('/protected')
    .set('Authorization', 'Bearer expired-token');

  assert.equal(response.status, 403);
  assert.equal(response.body.status, 'error');
});

test('works with a real JWT signed with the same secret', async () => {
  const { default: jwt } = await import('jsonwebtoken');
  const app = buildTestApp();

  const token = jwt.sign({ sub: 'user-id-2', username: 'player' }, TEST_JWT_SECRET, {
    expiresIn: '1h',
  });

  const response = await request(app)
    .get('/protected')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.sub, 'user-id-2');
  assert.equal(response.body.user.username, 'player');
});
