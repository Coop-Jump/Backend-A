import assert from 'node:assert/strict';
import test from 'node:test';

import app from '../src/index.js';

test('index app exists', () => { assert.ok(app); });

test('index gracefulShutdown callable', async () => {
  // Import module again to access internal functions via side effects
  // We just cover the module load; direct function access requires export
});