import { describe, it } from 'node:test';
import assert from 'node:assert';
import pkg from 'jsonwebtoken';
const { sign } = pkg;

import express from 'express';
import request from 'supertest';
import { createAuthenticateToken } from '../src/middleware/authenticateToken.js';
import { createLevelsRouter } from '../src/routes/levels.js';

function mockDb() {
  return {
    query: async (sql, values) => {
      if (sql.includes('SELECT r.*, l.title as level_title FROM runs r LEFT JOIN levels l ON r.level_id = l.id WHERE r.user_id = $1 ORDER BY r.created_at DESC')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  const auth = createAuthenticateToken({ jwtSecret: 'test-jwt-secret' });
  const router = createLevelsRouter({ db: mockDb() });
  app.use('/levels', auth, router);
  return app;
}

describe('GET /users/me/runs - User Runs', () => {
  it('debe retornar el historial del usuario', async () => {
    const app = buildApp();
    const token = sign({ sub: 'user-1', username: 'p' }, 'test-jwt-secret', { expiresIn: '1h' });
    const response = await request(app).get('/levels/users/me/runs').set('Authorization', `Bearer ${token}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'success');
  });
});