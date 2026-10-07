import { app } from './app';
import { config } from './config';
import { initDatabase, closeDatabase } from './db/database';
import { backgroundSyncService } from './services/scheduler.service';

async function bootstrap() {
  // Initialize SQLite database schema
  initDatabase();
  console.log(`[Database] Initialized SQLite database at ${config.DB_PATH}`);

  const server = app.listen(config.PORT, () => {
    console.log(`[Server] Server running on http://localhost:${config.PORT}`);
    console.log(`[Server] OpenAPI documentation available at http://localhost:${config.PORT}/docs`);
  });

  // Start background price synchronization scheduler
  backgroundSyncService.start();

  // Graceful shutdown handling
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

    // 1. Stop background sync tasks
    try {
      await backgroundSyncService.stop();
    } catch (err: any) {
      console.error('[BackgroundSync] Error stopping scheduler:', err.message);
    }

    // 2. Stop accepting incoming HTTP connections
    server.close(() => {
      console.log('[Server] HTTP server closed.');

      // 3. Safely close database connection
      try {
        closeDatabase();
        console.log('[Database] Database connection closed.');
      } catch (err: any) {
        console.error('[Database] Error closing DB:', err.message);
      }

      console.log('[Server] Shutdown complete. Exiting.');
      process.exit(0);
    });

    // Force shutdown after timeout in case hanging sockets
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully terminating.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
