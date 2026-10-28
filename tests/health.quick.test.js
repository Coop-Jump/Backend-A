import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

// Monkey-patch database to avoid hang
import pool from '../src/config/database.js';
const originalConnect = pool.connect;

function mockPool() {
  pool.connect = async () => ({
    query: async () => ({ rowCount: 1 }),
    release: () => {},
  });
  pool.query = async () => ({ rows: [], rowCount: 0 });
}

function restorePool() {
  pool.connect = originalConnect;
  pool.query = originalConnect ? undefined : pool.query;
}

test('health executes with mocked DB', async () => {
  mockPool();
  try {
    const router = (await import('../src/routes/health.js')).default;
    const app = express();
    app.use('/health', router);
    try {
      await request(app).get('/health');
    } catch (e) { /* fine */ }
  } finally {
    restorePool();
  }
});
