import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';

export function createApp({ authRouter: registeredAuthRouter = authRouter, logger = true } = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors());

  if (logger) {
    app.use(morgan('combined'));
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRouter);
  app.use('/auth', registeredAuthRouter);

  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON body',
      });
    }

    console.error('Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  });

  return app;
}

const app = createApp();

export default app;
