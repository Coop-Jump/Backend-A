import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';
import { createApp } from '../src/app.js';

test('app retorna 404 para rutas desconocidas', async () => {
  const app = createApp({ logger: false });
  const res = await request(app).get('/unknown');
  assert.equal(res.status, 404);
  assert.equal(res.body.status, 'error');
});

test('app retorna 400 para JSON malformado', async () => {
  const app = createApp({ authRouter: (await import('../src/routes/auth.js')).default, logger: false });
  const res = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{bad');
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Invalid JSON body');
});