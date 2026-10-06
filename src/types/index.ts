export interface Cryptocurrency {
  id: number;
  symbol: string;
  name: string;
  created_at: string;
  last_updated_at: string;
}

export interface CreateCryptoDto {
  symbol: string;
  name: string;
}

export interface UpdateCryptoDto {
  symbol?: string;
  name?: string;
}

export interface PriceRecord {
  id: number;
  cryptocurrency_id: number;
  symbol: string;
  price: number;
  currency: string;
  recorded_at: string;
}

export interface CreatePriceRecordDto {
  cryptocurrency_id: number;
  symbol: string;
  price: number;
  currency: string;
  recorded_at: string;
}

export interface CryptoWithLatestPrice extends Cryptocurrency {
  latest_price: number | null;
  currency: string;
}

export interface PriceHistoryFilter {
  limit?: number;
  page?: number;
  fromDate?: string;
  toDate?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CMCQuoteResponse {
  data: {
    [symbol: string]: {
      id: number;
      name: string;
      symbol: string;
      quote: {
        [currency: string]: {
          price: number;
          last_updated: string;
        };
      };
    };
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}
