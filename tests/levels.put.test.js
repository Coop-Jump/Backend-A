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
      if (sql.includes('SELECT id, title, difficulty, grid_json, created_at FROM levels WHERE id = $1')) {
        const id = values?.[0];
        return { rows: [{ id: id || 'l1', title: 'Level 1', difficulty: 'easy', grid_json: [], created_at: new Date() }], rowCount: 1 };
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

describe('Levels Update', () => {
  it('debe validar el endpoint GET /levels/:id (consulta individual)', async () => {
    const app = buildApp();
    const token = sign({ sub: 'user-1', username: 'p' }, 'test-jwt-secret', { expiresIn: '1h' });
    const response = await request(app).get('/levels/l1').set('Authorization', `Bearer ${token}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'success');
  });
});