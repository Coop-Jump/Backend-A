import { Router } from 'express';
import pool, { testConnection } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      return res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default router;