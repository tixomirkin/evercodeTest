import axios from 'axios';
import { CoinMarketCapService } from '../../src/services/cmc.service';
import { ExternalApiError } from '../../src/errors/app-error';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CoinMarketCapService Unit Tests', () => {
  let cmcService: CoinMarketCapService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    cmcService = new CoinMarketCapService('test-key', 'https://mock-cmc.com', 5000, 'USD');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully fetch cryptocurrency quotes for multiple symbols', async () => {
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        status: { error_code: 0, error_message: null },
        data: {
          BTC: {
            id: 1,
            name: 'Bitcoin',
            symbol: 'BTC',
            quote: {
              USD: {
                price: 65000.5,
                last_updated: '2026-10-08T12:00:00.000Z',
              },
            },
          },
          ETH: {
            id: 1027,
            name: 'Ethereum',
            symbol: 'ETH',
            quote: {
              USD: {
                price: 3500.25,
                last_updated: '2026-10-08T12:00:00.000Z',
              },
            },
          },
        },
      },
    });

    const quotes = await cmcService.getQuotes(['BTC', 'ETH']);

    expect(quotes.size).toBe(2);
    expect(quotes.get('BTC')?.price).toBe(65000.5);
    expect(quotes.get('ETH')?.price).toBe(3500.25);
  });

  it('should throw ExternalApiError with 504 on request timeout', async () => {
    const timeoutError: any = new Error('timeout of 5000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    timeoutError.isAxiosError = true;
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

    mockAxiosInstance.get.mockRejectedValue(timeoutError);

    await expect(cmcService.getQuotes(['BTC'])).rejects.toThrow(ExternalApiError);
    await expect(cmcService.getQuotes(['BTC'])).rejects.toMatchObject({
      statusCode: 504,
      message: 'CoinMarketCap API request timed out',
    });
  });

  it('should throw ExternalApiError with 503 on network failure (no response)', async () => {
    const networkError: any = new Error('Network Error');
    networkError.code = 'ENOTFOUND';
    networkError.isAxiosError = true;
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

    mockAxiosInstance.get.mockRejectedValueOnce(networkError);

    await expect(cmcService.getQuotes(['BTC'])).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('should throw ExternalApiError with 502 when CoinMarketCap returns 401 Unauthorized', async () => {
    const authError: any = new Error('Request failed with status code 401');
    authError.isAxiosError = true;
    authError.response = {
      status: 401,
      data: {
        status: { error_code: 1001, error_message: 'Invalid API Key' },
      },
    };
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

    mockAxiosInstance.get.mockRejectedValueOnce(authError);

    await expect(cmcService.getQuotes(['BTC'])).rejects.toMatchObject({
      statusCode: 502,
      message: 'CoinMarketCap authentication failed: invalid API key',
    });
  });

  it('should throw ExternalApiError with 429 when CoinMarketCap rate limit is exceeded', async () => {
    const rateLimitError: any = new Error('Request failed with status code 429');
    rateLimitError.isAxiosError = true;
    rateLimitError.response = {
      status: 429,
      data: {
        status: { error_code: 1008, error_message: 'Rate limit exceeded' },
      },
    };
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

    mockAxiosInstance.get.mockRejectedValueOnce(rateLimitError);

    await expect(cmcService.getQuotes(['BTC'])).rejects.toMatchObject({
      statusCode: 429,
      message: 'CoinMarketCap rate limit exceeded',
    });
  });

  it('should throw ExternalApiError with 502 when CoinMarketCap returns 500 server error', async () => {
    const serverError: any = new Error('Request failed with status code 500');
    serverError.isAxiosError = true;
    serverError.response = {
      status: 500,
      data: {
        status: { error_code: 500, error_message: 'Internal server error' },
      },
    };
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

    mockAxiosInstance.get.mockRejectedValueOnce(serverError);

    await expect(cmcService.getQuotes(['BTC'])).rejects.toMatchObject({
      statusCode: 502,
    });
  });
});
