import { Request, Response } from 'express';
import { getDatabase } from '../db/database';
import { backgroundSyncService } from '../services/scheduler.service';

export function getHealth(req: Request, res: Response): void {
  let dbStatus = 'ok';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch (error) {
    dbStatus = 'error';
  }

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbStatus,
      backgroundSync: backgroundSyncService.isRunning() ? 'running' : 'idle',
    },
  });
}
