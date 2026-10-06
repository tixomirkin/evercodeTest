import { Database as DatabaseType } from 'better-sqlite3';
import { getDatabase } from '../db/database';
import { Cryptocurrency, CryptoWithLatestPrice } from '../types';

export class CryptocurrencyRepository {
  private db: DatabaseType;

  constructor(db?: DatabaseType) {
    this.db = db || getDatabase();
  }

  create(symbol: string, name: string): Cryptocurrency {
    const now = new Date().toISOString();
    const normalizedSymbol = symbol.trim().toUpperCase();
    const normalizedName = name.trim();

    const stmt = this.db.prepare(`
      INSERT INTO cryptocurrencies (symbol, name, created_at, last_updated_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(normalizedSymbol, normalizedName, now, now);

    return {
      id: Number(result.lastInsertRowid),
      symbol: normalizedSymbol,
      name: normalizedName,
      created_at: now,
      last_updated_at: now,
    };
  }

  findById(id: number): Cryptocurrency | null {
    const stmt = this.db.prepare(`
      SELECT id, symbol, name, created_at, last_updated_at
      FROM cryptocurrencies
      WHERE id = ?
    `);

    const row = stmt.get(id) as Cryptocurrency | undefined;
    return row || null;
  }

  findBySymbol(symbol: string): Cryptocurrency | null {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const stmt = this.db.prepare(`
      SELECT id, symbol, name, created_at, last_updated_at
      FROM cryptocurrencies
      WHERE symbol = ?
    `);

    const row = stmt.get(normalizedSymbol) as Cryptocurrency | undefined;
    return row || null;
  }

  findAll(): Cryptocurrency[] {
    const stmt = this.db.prepare(`
      SELECT id, symbol, name, created_at, last_updated_at
      FROM cryptocurrencies
      ORDER BY id ASC
    `);

    return stmt.all() as Cryptocurrency[];
  }

  findAllWithLatestPrice(currency: string): CryptoWithLatestPrice[] {
    const stmt = this.db.prepare(`
      SELECT 
        c.id, 
        c.symbol, 
        c.name, 
        c.created_at, 
        c.last_updated_at,
        p.price as latest_price
      FROM cryptocurrencies c
      LEFT JOIN (
        SELECT cryptocurrency_id, price, MAX(recorded_at)
        FROM price_history
        WHERE currency = ?
        GROUP BY cryptocurrency_id
      ) p ON c.id = p.cryptocurrency_id
      ORDER BY c.id ASC
    `);

    const rows = stmt.all(currency) as any[];
    return rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      created_at: r.created_at,
      last_updated_at: r.last_updated_at,
      latest_price: r.latest_price !== null ? Number(r.latest_price) : null,
      currency,
    }));
  }

  update(id: number, data: { symbol?: string; name?: string }): Cryptocurrency | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const newSymbol = data.symbol ? data.symbol.trim().toUpperCase() : existing.symbol;
    const newName = data.name ? data.name.trim() : existing.name;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE cryptocurrencies
      SET symbol = ?, name = ?, last_updated_at = ?
      WHERE id = ?
    `);

    stmt.run(newSymbol, newName, now, id);

    return {
      id,
      symbol: newSymbol,
      name: newName,
      created_at: existing.created_at,
      last_updated_at: now,
    };
  }

  updateLastUpdated(id: number, timestamp: string): void {
    const stmt = this.db.prepare(`
      UPDATE cryptocurrencies
      SET last_updated_at = ?
      WHERE id = ?
    `);

    stmt.run(timestamp, id);
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM cryptocurrencies
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }
}
