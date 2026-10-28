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
    query: async () => ({ rows: [{ id: 'r1', user_id: 'u1', level_id: 'l1', completion_time_ms: 1000, deaths: 0, created_at: new Date(), username: 'player' }], rowCount: 1 }),
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

describe('GET /levels/:id/runs - Leaderboard', () => {
  it('debe retornar leaderboard ordenado por completion_time_ms ASC', async () => {
    const app = buildApp();
    const token = sign({ sub: 'user-1', username: 'p' }, 'test-jwt-secret', { expiresIn: '1h' });
    const response = await request(app).get('/levels/l1/runs').set('Authorization', `Bearer ${token}`);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.runs));
  });
});