import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import app from './app.js';
import pool from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
let server;

async function startServer() {
  // Sin JWT_SECRET no se pueden firmar ni verificar tokens: mejor fallar al arrancar.
  if (!process.env.JWT_SECRET) {
    console.error('Failed to start server: JWT_SECRET is not set');
    process.exit(1);
  }

  try {
    await pool.query('SELECT 1');

    server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down`);

  const forceExit = setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  const closePool = async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  if (server) {
    server.close(closePool);
  } else {
    await closePool();
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  startServer();
}

export default app;
