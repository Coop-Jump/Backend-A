import assert from 'node:assert/strict';
import test from 'node:test';

import { createLevelsRouter } from '../src/routes/levels.js';

function mockDb() {
  return {
    query: async (sql, values) => {
      if (sql.includes('SELECT id, title, difficulty')) return { rows: [{ id: 'l1', title: 'T', difficulty: 'e', grid_json: [], created_at: new Date() }], rowCount: 1 };
      if (sql.includes('WHERE id = $1')) return { rows: [{ id: values?.[0] || 'l1', title: 'T', difficulty: 'e', grid_json: [], created_at: new Date() }], rowCount: 1 };
      if (sql.includes('SELECT r.id, r.user_id')) return { rows: [{ id: 'r1', user_id: 'u1', level_id: 'l1', completion_time_ms: 100, deaths: 0, created_at: new Date(), username: 'p' }], rowCount: 1 };
      if (sql.includes('SELECT r.*, l.title')) return { rows: [{ id: 'r1', user_id: 'u1', level_id: 'l1', completion_time_ms: 500, deaths: 1, created_at: new Date() }], rowCount: 1 };
      if (sql.includes('INSERT INTO runs')) return { rows: [{ id: 'r1', user_id: 'u1', level_id: values?.[1], completion_time_ms: values?.[2], deaths: values?.[3], created_at: new Date() }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
  };
}

function getHandle(router, path, method) {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
  return layer ? layer.route.stack[0].handle : null;
}

function run(h, reqMock) {
  return new Promise((res) => {
    const resMock = { status: () => ({ json: () => res() }), headersSent: false };
    h(reqMock, resMock, () => res());
  });
}

const router = createLevelsRouter({ db: mockDb() });

const paths = [
  { p: '/', m: 'get', req: { query: {} } },
  { p: '/:id', m: 'get', req: { params: { id: 'l1' }, query: {} } },
  { p: '/runs', m: 'post', req: { user: { sub: 'u1' }, body: { level_id: 1, completion_time_ms: 100, deaths: 0 } } },
  { p: '/users/me/runs', m: 'get', req: { user: { sub: 'u1' } } },
  { p: '/:id/runs', m: 'get', req: { params: { id: 'l1' } } },
];

for (const item of paths) {
  const label = `${item.m.toUpperCase()} ${item.p}`;
  test(`execute ${label}`, async () => {
    const h = getHandle(router, item.p, item.m);
    assert.ok(h, 'handle exists for ' + label);
    await run(h, item.req);
  });
}
