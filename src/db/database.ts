import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let dbInstance: DatabaseType | null = null;

export function initDatabase(dbPath: string = config.DB_PATH): DatabaseType {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure directory exists if not using an in-memory database
  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency and enable foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables using raw SQL DDL
  createSchema(db);

  dbInstance = db;
  return db;
}

export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function createSchema(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cryptocurrencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cryptocurrency_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (cryptocurrency_id) REFERENCES cryptocurrencies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_crypto_symbol ON cryptocurrencies(symbol);
    CREATE INDEX IF NOT EXISTS idx_price_history_crypto_id ON price_history(cryptocurrency_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON price_history(symbol);
  `);
}
