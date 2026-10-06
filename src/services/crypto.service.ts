import { CryptocurrencyRepository } from '../repositories/cryptocurrency.repository';
import { PriceHistoryRepository } from '../repositories/price-history.repository';
import { CoinMarketCapService, cmcService } from './cmc.service';
import {
  Cryptocurrency,
  CryptoWithLatestPrice,
  CreateCryptoDto,
  UpdateCryptoDto,
  PriceHistoryFilter,
  PriceRecord,
  PaginatedResult,
} from '../types';
import { ConflictError, NotFoundError } from '../errors/app-error';
import { config } from '../config';

export class CryptoService {
  constructor(
    private cryptoRepo: CryptocurrencyRepository = new CryptocurrencyRepository(),
    private priceRepo: PriceHistoryRepository = new PriceHistoryRepository(),
    private cmc: CoinMarketCapService = cmcService,
    private baseCurrency: string = config.BASE_CURRENCY
  ) {}

  /**
   * Add a new cryptocurrency to track
   */
  async createCryptocurrency(dto: CreateCryptoDto): Promise<Cryptocurrency> {
    const symbol = dto.symbol.trim().toUpperCase();
    const existing = this.cryptoRepo.findBySymbol(symbol);

    if (existing) {
      throw new ConflictError(`Cryptocurrency with symbol '${symbol}' is already being tracked`);
    }

    const created = this.cryptoRepo.create(symbol, dto.name.trim());

    // Best-effort: fetch initial price if CMC API Key is provided
    if (config.CMC_API_KEY) {
      try {
        await this.fetchAndSavePrice(created.id);
        const updated = this.cryptoRepo.findById(created.id);
        if (updated) return updated;
      } catch (err) {
        // Log warning but don't fail crypto creation if CMC API is temporarily down
        console.warn(`Could not fetch initial price for ${symbol}:`, (err as any).message);
      }
    }

    return created;
  }

  /**
   * Get all tracked cryptocurrencies with their latest price
   */
  async getAllCryptocurrencies(): Promise<CryptoWithLatestPrice[]> {
    return this.cryptoRepo.findAllWithLatestPrice(this.baseCurrency);
  }

  /**
   * Get cryptocurrency by ID with latest price
   */
  async getCryptocurrencyById(id: number): Promise<CryptoWithLatestPrice> {
    const crypto = this.cryptoRepo.findById(id);
    if (!crypto) {
      throw new NotFoundError(`Cryptocurrency with ID ${id} not found`);
    }

    const latest = this.priceRepo.getLatestByCryptoId(id);

    return {
      ...crypto,
      latest_price: latest ? latest.price : null,
      currency: this.baseCurrency,
    };
  }

  /**
   * Update cryptocurrency
   */
  async updateCryptocurrency(id: number, dto: UpdateCryptoDto): Promise<Cryptocurrency> {
    const existing = this.cryptoRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Cryptocurrency with ID ${id} not found`);
    }

    if (dto.symbol) {
      const normalizedSymbol = dto.symbol.trim().toUpperCase();
      if (normalizedSymbol !== existing.symbol) {
        const symbolInUse = this.cryptoRepo.findBySymbol(normalizedSymbol);
        if (symbolInUse) {
          throw new ConflictError(`Cryptocurrency with symbol '${normalizedSymbol}' is already tracked`);
        }
      }
    }

    const updated = this.cryptoRepo.update(id, dto);
    if (!updated) {
      throw new NotFoundError(`Cryptocurrency with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Delete cryptocurrency
   */
  async deleteCryptocurrency(id: number): Promise<void> {
    const existing = this.cryptoRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Cryptocurrency with ID ${id} not found`);
    }

    this.cryptoRepo.delete(id);
  }

  /**
   * Fetch latest price from CoinMarketCap and record in price history
   */
  async fetchAndSavePrice(id: number): Promise<PriceRecord> {
    const crypto = this.cryptoRepo.findById(id);
    if (!crypto) {
      throw new NotFoundError(`Cryptocurrency with ID ${id} not found`);
    }

    const quote = await this.cmc.getQuote(crypto.symbol, this.baseCurrency);
    const recordedAt = new Date().toISOString();

    const priceRecord = this.priceRepo.create({
      cryptocurrency_id: crypto.id,
      symbol: crypto.symbol,
      price: quote.price,
      currency: this.baseCurrency,
      recorded_at: recordedAt,
    });

    this.cryptoRepo.updateLastUpdated(crypto.id, recordedAt);

    return priceRecord;
  }

  /**
   * Get price history for cryptocurrency with filters and pagination
   */
  async getPriceHistory(id: number, filter: PriceHistoryFilter): Promise<PaginatedResult<PriceRecord>> {
    const crypto = this.cryptoRepo.findById(id);
    if (!crypto) {
      throw new NotFoundError(`Cryptocurrency with ID ${id} not found`);
    }

    return this.priceRepo.findByCryptoId(id, filter);
  }

  /**
   * Synchronize prices for all tracked cryptocurrencies
   */
  async syncAllPrices(): Promise<{ updated: number; failed: number; total: number }> {
    const cryptos = this.cryptoRepo.findAll();
    if (cryptos.length === 0) {
      return { updated: 0, failed: 0, total: 0 };
    }

    const symbols = cryptos.map((c) => c.symbol);
    const quotes = await this.cmc.getQuotes(symbols, this.baseCurrency);

    const now = new Date().toISOString();
    let updated = 0;
    let failed = 0;

    const recordsToInsert = [];

    for (const crypto of cryptos) {
      const quote = quotes.get(crypto.symbol);
      if (quote) {
        recordsToInsert.push({
          cryptocurrency_id: crypto.id,
          symbol: crypto.symbol,
          price: quote.price,
          currency: this.baseCurrency,
          recorded_at: now,
        });
        this.cryptoRepo.updateLastUpdated(crypto.id, now);
        updated++;
      } else {
        failed++;
      }
    }

    if (recordsToInsert.length > 0) {
      this.priceRepo.createMany(recordsToInsert);
    }

    return { updated, failed, total: cryptos.length };
  }
}
