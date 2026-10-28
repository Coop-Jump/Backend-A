import assert from 'node:assert/strict';
import test from 'node:test';

import pkg from 'jsonwebtoken';
const { sign } = pkg;
import express from 'express';
import request from 'supertest';

import { createAuthenticateToken } from '../src/middleware/authenticateToken.js';
import { createLevelsRouter } from '../src/routes/levels.js';

const TEST_JWT_SECRET = 'test-jwt-secret';

// Mock database queries
function buildMockDb() {
  const calls = [];
  const db = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes('SELECT id, title, difficulty, grid_json, created_at FROM levels ORDER BY created_at ASC')) {
        return { rows: [{ id: 'l1', title: 'Level 1', difficulty: 'easy', grid_json: [], created_at: new Date() }, { id: 'l2', title: 'Level 2', difficulty: 'medium', grid_json: [], created_at: new Date() }], rowCount: 2 };
      }
      if (sql.includes('SELECT id, title, difficulty, grid_json, created_at FROM levels WHERE id = $1')) {
        const id = values?.[0];
        if (id === 'l1') return { rows: [{ id: 'l1', title: 'Level 1', difficulty: 'easy', grid_json: [], created_at: new Date() }], rowCount: 1 };
        if (id === 'l2') return { rows: [{ id: 'l2', title: 'Level 2', difficulty: 'medium', grid_json: [], created_at: new Date() }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('SELECT r.id, r.user_id, r.completion_time_ms, r.deaths, r.created_at, u.username FROM runs r LEFT JOIN levels l ON r.level_id = l.id LEFT JOIN users u ON r.user_id = u.id WHERE r.level_id = $1 AND l.id IS NOT NULL ORDER BY r.completion_time_ms ASC LIMIT 10')) {
        return { rows: [{ id: 'r1', user_id: 'u1', completion_time_ms: 1000, deaths: 0, created_at: new Date(), username: 'player' }], rowCount: 1 };
      }
      if (sql.includes('SELECT r.*, l.title as level_title FROM runs r LEFT JOIN levels l ON r.level_id = l.id WHERE r.user_id = $1 ORDER BY r.created_at DESC')) {
        return { rows: [{ id: 'r1', user_id: 'u1', level_id: 'l1', completion_time_ms: 1000, deaths: 0, created_at: new Date() }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO runs (user_id, level_id, completion_time_ms, deaths) VALUES')) {
        return { rows: [{ id: 'r1', user_id: 'u1', level_id: values?.[1], completion_time_ms: values?.[2], deaths: values?.[3], created_at: new Date() }], rowCount: 1 };
      }
      throw new Error('Unexpected SQL: ' + sql);
    },
  };
  db.calls = calls;
  return db;
}

// Helper to build test app with mocked DB
function buildTestApp({ db = buildMockDb() } = {}) {
  const app = express();
  app.use(express.json());
  const authenticateToken = createAuthenticateToken({ jwtSecret: TEST_JWT_SECRET });
  const levelsRouter = createLevelsRouter({ db });
  app.use('/levels', authenticateToken, levelsRouter);
  return app;
}

// Helper to get a valid auth token
function validToken(sub = 'user-id-1') {
  return sign({ sub, username: 'player' }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

test('GET /levels - debe listar niveles', async () => {
  const app = buildTestApp();
  const response = await request(app).get('/levels').set('Authorization', `Bearer ${validToken()}`);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.levels));
  assert.equal(response.body.levels.length, 2);
});

test('GET /levels/:id - debe obtener un nivel por ID', async () => {
  const app = buildTestApp();
  const response = await request(app).get('/levels/l1').set('Authorization', `Bearer ${validToken()}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.level.id, 'l1');
  assert.equal(response.body.level.title, 'Level 1');
});

test('GET /levels/:id - debe retornar 404 cuando no existe', async () => {
  const app = buildTestApp();
  const response = await request(app).get('/levels/nonexistent').set('Authorization', `Bearer ${validToken()}`);
  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Level not found');
});

test('GET /levels/:id/runs - leaderboard de un nivel', async () => {
  const app = buildTestApp();
  const response = await request(app).get('/levels/l1/runs').set('Authorization', `Bearer ${validToken()}`);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.runs));
});

test('POST /levels/runs - debe registrar una partida', async () => {
  const app = buildTestApp();
  const response = await request(app).post('/levels/runs').set('Authorization', `Bearer ${validToken()}`).send({ level_id: 'l1', completion_time_ms: 500, deaths: 1 });
  assert.equal(response.status, 201);
  assert.equal(response.body.status, 'success');
});

test('POST /levels/runs - debe fallar sin token', async () => {
  const app = buildTestApp();
  const response = await request(app).post('/levels/runs').send({ level_id: 'l1', completion_time_ms: 500, deaths: 1 });
  assert.equal(response.status, 401);
});

test('POST /levels/runs - debe fallar sin campos requeridos', async () => {
  const app = buildTestApp();
  const response = await request(app).post('/levels/runs').set('Authorization', `Bearer ${validToken()}`).send({});
  assert.equal(response.status, 400);
});

test('GET /users/me/runs - historial del usuario', async () => {
  const app = buildTestApp();
  const response = await request(app).get('/levels/users/me/runs').set('Authorization', `Bearer ${validToken()}`);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.runs));
});