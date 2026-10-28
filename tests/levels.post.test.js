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
    query: async () => ({ rows: [{ id: 'l1', title: 'Level 1', difficulty: 'easy', grid_json: [], created_at: new Date() }], rowCount: 1 }),
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

describe('POST /runs endpoint', () => {
  it('debe registrar una partida en POST /levels/runs', async () => {
    const app = buildApp();
    const token = sign({ sub: 'user-1', username: 'p' }, 'test-jwt-secret', { expiresIn: '1h' });
    const response = await request(app).post('/levels/runs').set('Authorization', `Bearer ${token}`).send({ level_id: 'l1', completion_time_ms: 100, deaths: 0 });
    assert.equal(response.status, 201);
    assert.equal(response.body.status, 'success');
  });
});