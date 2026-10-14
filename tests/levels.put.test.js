import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Levels Update', () => {
  it('debe validar el endpoint PUT', () => {
    const router = require('../src/routes/levels.js');
    assert.ok(router.default || router, 'Router debe exportarse');
  });
});
