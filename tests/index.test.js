import assert from 'node:assert/strict';
import test from 'node:test';

import app from '../src/index.js';

test('index.js exporta la aplicación sin iniciar el servidor', () => {
  assert.ok(app);
  assert.equal(typeof app.listen, 'function');
});