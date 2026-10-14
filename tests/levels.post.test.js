import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test básico para POST /levels (estructura)
describe('Levels CRUD', () => {
  it('debe tener un módulo exportado', () => {
    const levelsRouter = require('../src/routes/levels.js');
    assert.ok(levelsRouter, 'Router debe existir');
  });
});
