import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';

import app from './app.js';
import pool from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
let server;

async function startServer() {
  try {
    await pool.query('SELECT 1');

    server = app.listen(PORT);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  if (server) {
    server.close(async () => {
      try {
        await pool.end();
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
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
