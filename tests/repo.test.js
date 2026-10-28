import assert from 'node:assert/strict';
import test from 'node:test';

import { LevelRepository } from '../src/repositories/level.repository.js';

test('LevelRepository ejecuta consultas parametrizadas', async () => {
  const calls = [];
  const mockDb = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [{ id: 'l1', title: 'T', difficulty: 'easy', grid_json: '[]', created_at: new Date() }], rowCount: 1 };
    },
  };
  const repo = new LevelRepository(mockDb);
  await repo.create({ title: 'T', difficulty: 'easy', grid_json: [] });
  assert.ok(calls.length >= 1);
  assert.ok(calls[0].sql.includes('$1'));
});