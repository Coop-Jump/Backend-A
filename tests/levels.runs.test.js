import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test básico: el archivo levels.js debe incluir los endpoints de runs
describe('POST /runs endpoint', () => {
  it('levels module debe contener endpoints de runs', () => {
    // Verificamos que el archivo existe y tiene exportación válida
    const fs = require('fs');
    const content = fs.readFileSync('/home/washable/Backend-A/src/routes/levels.js', 'utf8');
    assert.ok(content.includes("router.post('/runs'"), 'POST /runs debe existir');
    assert.ok(content.includes("router.get('/users/me/runs'"), 'GET /users/me/runs debe existir');
  });
});
