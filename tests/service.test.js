import assert from 'node:assert/strict';
import test from 'node:test';

import { LevelService } from '../src/services/level.service.js';

test('LevelService crea utilizando repositorio mock', async () => {
  const mockRepo = {
    create: async (d) => ({ rows: [{ ...d, id: 'l1' }] }),
    update: async (id, d) => ({ rows: [{ ...d, id }] }),
    delete: async (id) => ({ rows: [{ id }] }),
  };
  const svc = new LevelService(mockRepo);
  const result = await svc.create({ title: 'T', difficulty: 'easy', grid_json: [] });
  assert.ok(result);
  assert.equal(result.rows[0].id, 'l1');
});