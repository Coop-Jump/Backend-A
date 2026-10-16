import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test básico: el endpoint GET /levels/:id/runs existe
describe('GET /levels/:id/runs - Leaderboard', () => {
  it('debe tener endpoint de leaderboard', () => {
    const fs = require('fs');
    const content = fs.readFileSync('/home/washable/Backend-A/src/routes/levels.js', 'utf8');
    assert.ok(content.includes("router.get('/:id/runs'"), 'GET /:id/runs debe existir');
    assert.ok(content.includes('ORDER BY r.completion_time_ms ASC'), 'Debe ordenar por completion_time_ms ASC');
    assert.ok(content.includes('LIMIT 10'), 'Debe limitar a 10 resultados');
  });
});
