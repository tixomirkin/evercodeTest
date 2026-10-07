import { Database as DatabaseType } from 'better-sqlite3';
import { initDatabase, closeDatabase } from '../../src/db/database';

export function setupTestDatabase(): DatabaseType {
  // Always close any previous instance
  closeDatabase();
  // Open fresh in-memory SQLite database
  return initDatabase(':memory:');
}

export function teardownTestDatabase(): void {
  closeDatabase();
}
