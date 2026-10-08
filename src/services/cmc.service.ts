import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import { ExternalApiError } from '../errors/app-error';
import { CMCQuoteResponse } from '../types';

export interface CMCQuoteResult {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  lastUpdated: string;
}

export class CoinMarketCapService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseCurrency: string;

  constructor(apiKey: string = config.CMC_API_KEY, baseURL: string = config.CMC_BASE_URL, timeout: number = config.CMC_TIMEOUT_MS, baseCurrency: string = config.BASE_CURRENCY) {
    this.apiKey = apiKey;
    this.baseCurrency = baseCurrency;
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'X-CMC_PRO_API_KEY': this.apiKey,
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Fetches latest quotes for given symbols in single base currency
   */
  async getQuotes(symbols: string[], convert: string = this.baseCurrency): Promise<Map<string, CMCQuoteResult>> {
    if (!symbols.length) {
      return new Map();
    }

    const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase())));
    const symbolsParam = uniqueSymbols.join(',');
    const convertParam = convert.toUpperCase();

    try {
      const response = await this.client.get<CMCQuoteResponse>('/v1/cryptocurrency/quotes/latest', {
        params: {
          symbol: symbolsParam,
          convert: convertParam,
        },
      });

      const data = response.data;

      if (!data || !data.data) {
        throw new ExternalApiError('Invalid response received from CoinMarketCap API', 502);
      }

      const results = new Map<string, CMCQuoteResult>();

      for (const sym of uniqueSymbols) {
        const item = data.data[sym];
        if (item && item.quote && item.quote[convertParam]) {
          results.set(sym, {
            symbol: item.symbol,
            name: item.name,
            price: item.quote[convertParam].price,
            currency: convertParam,
            lastUpdated: item.quote[convertParam].last_updated || new Date().toISOString(),
          });
        }
      }

      return results;
    } catch (error: any) {
      this.handleAxiosError(error);
    }
  }

  /**
   * Fetches latest quote for a single cryptocurrency symbol
   */
  async getQuote(symbol: string, convert: string = this.baseCurrency): Promise<CMCQuoteResult> {
    const quotes = await this.getQuotes([symbol], convert);
    const result = quotes.get(symbol.toUpperCase());

    if (!result) {
      throw new ExternalApiError(`No price quote found for symbol: ${symbol.toUpperCase()} in CoinMarketCap`, 404);
    }

    return result;
  }

  private handleAxiosError(error: any): never {
    const isTimeout =
      error.code === 'ECONNABORTED' ||
      (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'));

    if (isTimeout) {
      throw new ExternalApiError('CoinMarketCap API request timed out', 504, {
        timeout: config.CMC_TIMEOUT_MS,
      });
    }

    if (axios.isAxiosError(error) || error.isAxiosError) {
      if (!error.response) {
        throw new ExternalApiError(
          `Unable to reach CoinMarketCap API: ${error.message || 'Network error'}`,
          503,
          { code: error.code }
        );
      }

      const status = error.response.status;
      const responseBody = error.response.data;
      const errorMessage =
        responseBody?.status?.error_message ||
        responseBody?.message ||
        error.message ||
        'CoinMarketCap API request failed';

      if (status === 401) {
        throw new ExternalApiError('CoinMarketCap authentication failed: invalid API key', 502, {
          externalStatus: 401,
          message: errorMessage,
        });
      }

      if (status === 429) {
        throw new ExternalApiError('CoinMarketCap rate limit exceeded', 429, {
          externalStatus: 429,
          message: errorMessage,
        });
      }

      if (status >= 500) {
        throw new ExternalApiError(`CoinMarketCap server error (${status}): ${errorMessage}`, 502, {
          externalStatus: status,
        });
      }

      throw new ExternalApiError(`CoinMarketCap API error (${status}): ${errorMessage}`, 400, {
        externalStatus: status,
        message: errorMessage,
      });
    }

    if (error instanceof ExternalApiError) {
      throw error;
    }

    throw new ExternalApiError(error.message || 'Unexpected error communicating with CoinMarketCap', 500);
  }
}

export const cmcService = new CoinMarketCapService();
