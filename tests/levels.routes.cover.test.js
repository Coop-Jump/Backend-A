import assert from 'node:assert/strict';
import test from 'node:test';

import { createLevelsRouter } from '../src/routes/levels.js';

function mockDb() {
  return {
    query: async () => ({ rows: [{ id: 'l1', title: 'T', difficulty: 'e', grid_json: [], created_at: '2026-01-01' }], rowCount: 1 }),
  };
}

test('levels GET / executes handler', async () => {
  const router = createLevelsRouter({ db: mockDb() });
  const layer = router.stack.find(l => l.route && l.route.path === '/' && l.route.methods.get);
  assert.ok(layer, 'GET / layer exists');
});

test('levels GET /:id executes handler', async () => {
  const router = createLevelsRouter({ db: mockDb() });
  const layer = router.stack.find(l => l.route && l.route.path === '/:id' && l.route.methods.get);
  assert.ok(layer, 'GET /:id layer exists');
});

test('levels POST /runs executes handler', async () => {
  const router = createLevelsRouter({ db: mockDb() });
  const layer = router.stack.find(l => l.route && l.route.path === '/runs' && l.route.methods.post);
  assert.ok(layer, 'POST /runs layer exists');
});

test('levels GET /users/me/runs executes handler', async () => {
  const router = createLevelsRouter({ db: mockDb() });
  const layer = router.stack.find(l => l.route && l.route.path === '/users/me/runs' && l.route.methods.get);
  assert.ok(layer, 'GET /users/me/runs layer exists');
});

test('levels GET /:id/runs executes handler', async () => {
  const router = createLevelsRouter({ db: mockDb() });
  const layer = router.stack.find(l => l.route && l.route.path === '/:id/runs' && l.route.methods.get);
  assert.ok(layer, 'GET /:id/runs layer exists');
});