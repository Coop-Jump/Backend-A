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

test('LevelService update utiliza repositorio mock', async () => {
  const mockRepo = {
    create: async (d) => ({ rows: [{ ...d, id: 'l1' }] }),
    update: async (id, d) => ({ rows: [{ ...d, id }] }),
    delete: async (id) => ({ rows: [{ id }] }),
  };
  const svc = new LevelService(mockRepo);
  const result = await svc.update('l1', { title: 'Updated', difficulty: 'hard', grid_json: [] });
  assert.ok(result);
  assert.equal(result.rows[0].id, 'l1');
  assert.equal(result.rows[0].title, 'Updated');
});

test('LevelService delete utiliza repositorio mock', async () => {
  const mockRepo = {
    create: async (d) => ({ rows: [{ ...d, id: 'l1' }] }),
    update: async (id, d) => ({ rows: [{ ...d, id }] }),
    delete: async (id) => ({ rows: [{ id }] }),
  };
  const svc = new LevelService(mockRepo);
  const result = await svc.delete('l1');
  assert.ok(result);
  assert.equal(result.rows[0].id, 'l1');
});