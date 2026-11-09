import assert from 'node:assert/strict';
import test from 'node:test';

import pkg from 'jsonwebtoken';
const { sign } = pkg;
import express from 'express';
import request from 'supertest';

import { createAuthenticateToken } from '../src/middleware/authenticateToken.js';
import { createLevelsRouter } from '../src/routes/levels.js';
import { validateLevelPayload } from '../src/validators/level.validator.js';

const SECRET = 'test-jwt-secret';
const GRID = { grid_width: 20, grid_height: 15, platforms: [] };
const VALID = { title: 'Nivel nuevo', difficulty: 'expert', grid_json: GRID };

function buildDb({ failWith } = {}) {
  const calls = [];
  return {
    calls,
    query: async (sql, values) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      if (failWith) throw failWith;
      if (sql.includes('INSERT INTO levels')) {
        return { rows: [{ id: 'new-id', title: values[0], difficulty: values[1], grid_json: JSON.parse(values[2]), created_at: new Date() }], rowCount: 1 };
      }
      if (sql.includes('UPDATE levels')) {
        if (values[3] === 'missing') return { rows: [], rowCount: 0 };
        return { rows: [{ id: values[3], title: values[0], difficulty: values[1], grid_json: JSON.parse(values[2]), created_at: new Date() }], rowCount: 1 };
      }
      if (sql.includes('DELETE FROM levels')) {
        if (values[0] === 'missing') return { rows: [], rowCount: 0 };
        return { rows: [{ id: values[0], title: 'T' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function buildApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/levels', createAuthenticateToken({ jwtSecret: SECRET }), createLevelsRouter({ db }));
  return app;
}

const token = () => sign({ sub: 'user-1', username: 'p' }, SECRET, { expiresIn: '1h' });
const auth = (req) => req.set('Authorization', `Bearer ${token()}`);
const pgError = (code) => Object.assign(new Error('pg'), { code });

test('POST /levels crea un nivel y guarda created_by', async () => {
  const db = buildDb();
  const res = await auth(request(buildApp(db)).post('/levels')).send(VALID);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'success');
  assert.equal(res.body.level.title, 'Nivel nuevo');
  assert.deepEqual(res.body.level.grid_json, GRID);
  assert.deepEqual(db.calls[0].values, ['Nivel nuevo', 'expert', JSON.stringify(GRID), 'user-1']);
});

test('POST /levels recorta el título', async () => {
  const res = await auth(request(buildApp(buildDb())).post('/levels')).send({ ...VALID, title: '  Hola  ' });
  assert.equal(res.status, 201);
  assert.equal(res.body.level.title, 'Hola');
});

test('POST /levels exige autenticación', async () => {
  const res = await request(buildApp(buildDb())).post('/levels').send(VALID);
  assert.equal(res.status, 401);
});

for (const [name, body, field] of [
  ['sin título', { ...VALID, title: '   ' }, 'title'],
  ['título demasiado largo', { ...VALID, title: 'x'.repeat(101) }, 'title'],
  ['dificultad inválida', { ...VALID, difficulty: 'imposible' }, 'difficulty'],
  ['sin dificultad', { title: 'T', grid_json: GRID }, 'difficulty'],
  ['sin grid_json', { title: 'T', difficulty: 'easy' }, 'grid_json'],
  ['grid_json null', { ...VALID, grid_json: null }, 'grid_json'],
  ['grid_json array', { ...VALID, grid_json: [] }, 'grid_json'],
  ['grid_json string', { ...VALID, grid_json: 'abc' }, 'grid_json'],
]) {
  test(`POST /levels responde 400 ${name}`, async () => {
    const db = buildDb();
    const res = await auth(request(buildApp(db)).post('/levels')).send(body);
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.includes(field));
    assert.equal(db.calls.length, 0, 'no debe consultar la base');
  });
}

test('POST /levels responde 400 sin body', async () => {
  const res = await auth(request(buildApp(buildDb())).post('/levels'));
  assert.equal(res.status, 400);
});

test('POST /levels responde 401 si el usuario del token ya no existe', async () => {
  const res = await auth(request(buildApp(buildDb({ failWith: pgError('23503') }))).post('/levels')).send(VALID);
  assert.equal(res.status, 401);
});

test('POST /levels responde 500 ante un error de base', async () => {
  const res = await auth(request(buildApp(buildDb({ failWith: new Error('boom') }))).post('/levels')).send(VALID);
  assert.equal(res.status, 500);
});

test('PUT /levels/:id actualiza un nivel', async () => {
  const res = await auth(request(buildApp(buildDb())).put('/levels/l1')).send(VALID);
  assert.equal(res.status, 200);
  assert.equal(res.body.level.id, 'l1');
});

test('PUT /levels/:id responde 400 con datos inválidos (antes era 500)', async () => {
  const res = await auth(request(buildApp(buildDb())).put('/levels/l1')).send({ title: 'solo título' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.fields, ['difficulty', 'grid_json']);
});

test('PUT /levels/:id responde 404 si no existe', async () => {
  const res = await auth(request(buildApp(buildDb())).put('/levels/missing')).send(VALID);
  assert.equal(res.status, 404);
});

test('PUT /levels/:id responde 404 si el id no es un UUID', async () => {
  const res = await auth(request(buildApp(buildDb({ failWith: pgError('22P02') }))).put('/levels/abc')).send(VALID);
  assert.equal(res.status, 404);
});

test('DELETE /levels/:id elimina un nivel', async () => {
  const res = await auth(request(buildApp(buildDb())).delete('/levels/l1'));
  assert.equal(res.status, 200);
  assert.equal(res.body.message, 'Level deleted');
});

test('DELETE /levels/:id responde 404 si no existe o el id es inválido', async () => {
  assert.equal((await auth(request(buildApp(buildDb())).delete('/levels/missing'))).status, 404);
  assert.equal((await auth(request(buildApp(buildDb({ failWith: pgError('22P02') }))).delete('/levels/abc'))).status, 404);
});

test('DELETE /levels/:id responde 500 ante un error de base', async () => {
  const res = await auth(request(buildApp(buildDb({ failWith: new Error('boom') }))).delete('/levels/l1'));
  assert.equal(res.status, 500);
});

test('GET /levels/:id y /levels/:id/runs responden 404 con id que no es UUID', async () => {
  const app = buildApp(buildDb({ failWith: pgError('22P02') }));
  assert.equal((await auth(request(app).get('/levels/abc'))).status, 404);
  assert.equal((await auth(request(app).get('/levels/abc/runs'))).status, 404);
});

test('POST /levels/runs rechaza valores negativos, decimales o no numéricos', async () => {
  const app = buildApp(buildDb());
  for (const body of [
    { level_id: 'l1', completion_time_ms: -5, deaths: 0 },
    { level_id: 'l1', completion_time_ms: 10, deaths: -1 },
    { level_id: 'l1', completion_time_ms: 1.5, deaths: 0 },
    { level_id: 'l1', completion_time_ms: '12abc', deaths: 0 },
    { level_id: 'l1', completion_time_ms: true, deaths: 0 },
  ]) {
    const res = await auth(request(app).post('/levels/runs')).send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

test('POST /levels/runs acepta strings numéricos', async () => {
  const res = await auth(request(buildApp(buildDb())).post('/levels/runs')).send({ level_id: 'l1', completion_time_ms: '1500', deaths: '2' });
  assert.equal(res.status, 201);
});

test('validateLevelPayload devuelve el valor limpio', () => {
  const result = validateLevelPayload({ ...VALID, title: ' T ', extra: 1 });
  assert.deepEqual(result.value, { title: 'T', difficulty: 'expert', grid_json: GRID });
});
