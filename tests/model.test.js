import assert from 'node:assert/strict';
import test from 'node:test';

import { Level } from '../src/models/level.model.js';

test('Level model crea una instancia', () => {
  const level = new Level('l1', 'Title', 'easy', { grid: [[1, 2]] }, '2026-01-01');
  assert.equal(level.id, 'l1');
  assert.equal(level.title, 'Title');
  assert.equal(level.difficulty, 'easy');
  assert.equal(level.gridJson.grid[0][0], 1);
  assert.equal(level.createdAt, '2026-01-01');
});