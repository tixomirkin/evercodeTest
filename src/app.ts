import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { authMiddleware } from './middlewares/auth.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { cryptoRouter } from './routes/crypto.routes';
import { getHealth } from './controllers/health.controller';
import { NotFoundError } from './errors/app-error';

export function createApp(): Application {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Swagger Documentation
  try {
    const candidatePaths = [
      path.resolve(__dirname, 'docs/openapi.yaml'),
      path.resolve(__dirname, '../src/docs/openapi.yaml'),
      path.resolve(process.cwd(), 'src/docs/openapi.yaml'),
    ];
    const swaggerDocPath = candidatePaths.find((p) => fs.existsSync(p));

    if (swaggerDocPath) {
      const swaggerDocument = YAML.load(swaggerDocPath);
      app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } else {
      console.warn('Could not locate openapi.yaml for Swagger UI');
    }
  } catch (err) {
    console.warn('Could not load OpenAPI documentation:', (err as any).message);
  }

  // Health check endpoint (public, unauthenticated)
  app.get('/health', getHealth);

  // Protected REST API routes
  app.use('/api/v1/cryptocurrencies', authMiddleware, cryptoRouter);

  // Catch-all for undefined routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
