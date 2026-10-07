import { Database as DatabaseType } from 'better-sqlite3';
import { getDatabase } from '../db/database';
import { CreatePriceRecordDto, PriceHistoryFilter, PriceRecord, PaginatedResult } from '../types';

export class PriceHistoryRepository {
  private customDb?: DatabaseType;

  constructor(db?: DatabaseType) {
    this.customDb = db;
  }

  private get db(): DatabaseType {
    return this.customDb || getDatabase();
  }

  create(record: CreatePriceRecordDto): PriceRecord {
    const stmt = this.db.prepare(`
      INSERT INTO price_history (cryptocurrency_id, symbol, price, currency, recorded_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      record.cryptocurrency_id,
      record.symbol.toUpperCase(),
      record.price,
      record.currency.toUpperCase(),
      record.recorded_at
    );

    return {
      id: Number(result.lastInsertRowid),
      cryptocurrency_id: record.cryptocurrency_id,
      symbol: record.symbol.toUpperCase(),
      price: record.price,
      currency: record.currency.toUpperCase(),
      recorded_at: record.recorded_at,
    };
  }

  createMany(records: CreatePriceRecordDto[]): void {
    if (records.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO price_history (cryptocurrency_id, symbol, price, currency, recorded_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((items: CreatePriceRecordDto[]) => {
      for (const item of items) {
        stmt.run(
          item.cryptocurrency_id,
          item.symbol.toUpperCase(),
          item.price,
          item.currency.toUpperCase(),
          item.recorded_at
        );
      }
    });

    insertMany(records);
  }

  findByCryptoId(cryptoId: number, filter: PriceHistoryFilter = {}): PaginatedResult<PriceRecord> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const offset = (page - 1) * limit;
    const order = (filter.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = ['cryptocurrency_id = ?'];
    const params: any[] = [cryptoId];

    if (filter.fromDate) {
      conditions.push('recorded_at >= ?');
      params.push(filter.fromDate);
    }

    if (filter.toDate) {
      conditions.push('recorded_at <= ?');
      params.push(filter.toDate);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM price_history
      WHERE ${whereClause}
    `);
    const totalRow = countStmt.get(...params) as { count: number };
    const total = totalRow.count;

    // Get paginated rows
    const dataStmt = this.db.prepare(`
      SELECT id, cryptocurrency_id, symbol, price, currency, recorded_at
      FROM price_history
      WHERE ${whereClause}
      ORDER BY recorded_at ${order}
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, limit, offset) as PriceRecord[];

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  getLatestByCryptoId(cryptoId: number): PriceRecord | null {
    const stmt = this.db.prepare(`
      SELECT id, cryptocurrency_id, symbol, price, currency, recorded_at
      FROM price_history
      WHERE cryptocurrency_id = ?
      ORDER BY recorded_at DESC
      LIMIT 1
    `);

    const row = stmt.get(cryptoId) as PriceRecord | undefined;
    return row || null;
  }
}
