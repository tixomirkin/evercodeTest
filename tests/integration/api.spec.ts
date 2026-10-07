import request from 'supertest';
import { app } from '../../src/app';
import { config } from '../../src/config';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-db';
import { cmcService } from '../../src/services/cmc.service';
import { ExternalApiError } from '../../src/errors/app-error';

describe('Crypto Price Tracker API Integration Tests', () => {
  const validToken = config.API_BEARER_TOKEN;

  beforeEach(() => {
    // Setup fresh in-memory database
    setupTestDatabase();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  // ---------------------------------------------------------
  // 1. Health check endpoint (Public)
  // ---------------------------------------------------------
  describe('GET /health', () => {
    it('POSITIVE: should return 200 with service health status without authorization', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.services.database).toBe('ok');
    });
  });

  // ---------------------------------------------------------
  // 2. Authentication and Authorization
  // ---------------------------------------------------------
  describe('Authentication Middleware', () => {
    it('NEGATIVE: should return 401 Unauthorized when no Authorization header is provided', async () => {
      const res = await request(app).get('/api/v1/cryptocurrencies');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Authorization header is missing');
    });

    it('NEGATIVE: should return 401 Unauthorized when Bearer token format is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/cryptocurrencies')
        .set('Authorization', 'Basic 123456');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("Expected 'Bearer <token>'");
    });

    it('NEGATIVE: should return 401 Unauthorized when token is incorrect', async () => {
      const res = await request(app)
        .get('/api/v1/cryptocurrencies')
        .set('Authorization', 'Bearer invalid-token-xyz');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid or expired Bearer token');
    });
  });

  // ---------------------------------------------------------
  // 3. POST /api/v1/cryptocurrencies (Create)
  // ---------------------------------------------------------
  describe('POST /api/v1/cryptocurrencies', () => {
    it('POSITIVE: should create a new tracked cryptocurrency', async () => {
      const res = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          symbol: 'btc',
          name: 'Bitcoin',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.symbol).toBe('BTC'); // Normalized to uppercase
      expect(res.body.data.name).toBe('Bitcoin');
      expect(res.body.data.created_at).toBeDefined();
      expect(res.body.data.last_updated_at).toBeDefined();
    });

    it('NEGATIVE: should return 400 Bad Request when symbol is missing or empty', async () => {
      const res = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Bitcoin',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.name).toBe('BadRequestError');
    });

    it('NEGATIVE: should return 400 Bad Request when symbol contains invalid characters', async () => {
      const res = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          symbol: 'BTC$$',
          name: 'Bitcoin',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('NEGATIVE: should return 409 Conflict when cryptocurrency with same symbol already exists', async () => {
      await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'ETH', name: 'Ethereum' });

      const res = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'ETH', name: 'Ethereum Second' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.name).toBe('ConflictError');
    });
  });

  // ---------------------------------------------------------
  // 4. GET /api/v1/cryptocurrencies (List all)
  // ---------------------------------------------------------
  describe('GET /api/v1/cryptocurrencies', () => {
    it('POSITIVE: should return list of all tracked cryptocurrencies', async () => {
      await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'SOL', name: 'Solana' });

      const res = await request(app)
        .get('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].symbol).toBe('SOL');
    });
  });

  // ---------------------------------------------------------
  // 5. GET /api/v1/cryptocurrencies/:id (Get by ID)
  // ---------------------------------------------------------
  describe('GET /api/v1/cryptocurrencies/:id', () => {
    it('POSITIVE: should return cryptocurrency details by ID', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'ADA', name: 'Cardano' });

      const id = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/v1/cryptocurrencies/${id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(id);
      expect(res.body.data.symbol).toBe('ADA');
    });

    it('NEGATIVE: should return 404 Not Found when ID does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/cryptocurrencies/999999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.name).toBe('NotFoundError');
    });

    it('NEGATIVE: should return 400 Bad Request when ID is not a positive integer', async () => {
      const res = await request(app)
        .get('/api/v1/cryptocurrencies/not-a-number')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // 6. PUT /api/v1/cryptocurrencies/:id (Update)
  // ---------------------------------------------------------
  describe('PUT /api/v1/cryptocurrencies/:id', () => {
    it('POSITIVE: should successfully update cryptocurrency name and symbol', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'DOT', name: 'Polkadot' });

      const id = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/cryptocurrencies/${id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Polkadot Network' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.name).toBe('Polkadot Network');
      expect(updateRes.body.data.symbol).toBe('DOT');
    });

    it('NEGATIVE: should return 400 Bad Request when body contains neither symbol nor name', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'AVAX', name: 'Avalanche' });

      const id = createRes.body.data.id;

      const res = await request(app)
        .put(`/api/v1/cryptocurrencies/${id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('NEGATIVE: should return 404 Not Found when updating non-existent cryptocurrency', async () => {
      const res = await request(app)
        .put('/api/v1/cryptocurrencies/999999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Phantom' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('NEGATIVE: should return 409 Conflict when updating symbol to an already taken symbol', async () => {
      await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'XRP', name: 'Ripple' });

      const second = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'DOGE', name: 'Dogecoin' });

      const res = await request(app)
        .put(`/api/v1/cryptocurrencies/${second.body.data.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'XRP' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // 7. DELETE /api/v1/cryptocurrencies/:id (Delete)
  // ---------------------------------------------------------
  describe('DELETE /api/v1/cryptocurrencies/:id', () => {
    it('POSITIVE: should delete cryptocurrency by ID', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'LINK', name: 'Chainlink' });

      const id = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/cryptocurrencies/${id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/v1/cryptocurrencies/${id}`)
        .set('Authorization', `Bearer ${validToken}`);
      expect(getRes.status).toBe(404);
    });

    it('NEGATIVE: should return 404 Not Found when deleting non-existent ID', async () => {
      const res = await request(app)
        .delete('/api/v1/cryptocurrencies/999999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // 8. POST /api/v1/cryptocurrencies/:id/price (Live CMC Price fetch & save)
  // ---------------------------------------------------------
  describe('POST /api/v1/cryptocurrencies/:id/price', () => {
    it('POSITIVE: should fetch live price from CoinMarketCap and record in database', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'BTC', name: 'Bitcoin' });

      const id = createRes.body.data.id;

      jest.spyOn(cmcService, 'getQuote').mockResolvedValueOnce({
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 68120.45,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      });

      const res = await request(app)
        .post(`/api/v1/cryptocurrencies/${id}/price`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.symbol).toBe('BTC');
      expect(res.body.data.price).toBe(68120.45);
      expect(res.body.data.currency).toBe('USD');
      expect(res.body.data.recorded_at).toBeDefined();
    });

    it('NEGATIVE: should return 404 Not Found if cryptocurrency does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/cryptocurrencies/999999/price')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('NEGATIVE: should return 502 Bad Gateway if external CMC API fails with 500', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'BTC', name: 'Bitcoin' });

      const id = createRes.body.data.id;

      jest.spyOn(cmcService, 'getQuote').mockRejectedValueOnce(
        new ExternalApiError('CoinMarketCap server error (500)', 502)
      );

      const res = await request(app)
        .post(`/api/v1/cryptocurrencies/${id}/price`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error.name).toBe('ExternalApiError');
    });

    it('NEGATIVE: should return 504 Gateway Timeout if CMC API times out', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'BTC', name: 'Bitcoin' });

      const id = createRes.body.data.id;

      jest.spyOn(cmcService, 'getQuote').mockRejectedValueOnce(
        new ExternalApiError('CoinMarketCap API request timed out', 504)
      );

      const res = await request(app)
        .post(`/api/v1/cryptocurrencies/${id}/price`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(504);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('timed out');
    });
  });

  // ---------------------------------------------------------
  // 9. GET /api/v1/cryptocurrencies/:id/history (Price history)
  // ---------------------------------------------------------
  describe('GET /api/v1/cryptocurrencies/:id/history', () => {
    it('POSITIVE: should return paginated price history for cryptocurrency', async () => {
      const createRes = await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'ETH', name: 'Ethereum' });

      const id = createRes.body.data.id;

      jest.spyOn(cmcService, 'getQuote').mockResolvedValueOnce({
        symbol: 'ETH',
        name: 'Ethereum',
        price: 3400.0,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      });

      await request(app)
        .post(`/api/v1/cryptocurrencies/${id}/price`)
        .set('Authorization', `Bearer ${validToken}`);

      const res = await request(app)
        .get(`/api/v1/cryptocurrencies/${id}/history?limit=10&page=1&order=desc`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].price).toBe(3400.0);
    });

    it('NEGATIVE: should return 404 Not Found if cryptocurrency does not exist', async () => {
      const res = await request(app)
        .get('/api/v1/cryptocurrencies/999999/history')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('NEGATIVE: should return 400 Bad Request when limit or page is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/cryptocurrencies/1/history?limit=9999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // 10. POST /api/v1/cryptocurrencies/sync (Bulk Sync)
  // ---------------------------------------------------------
  describe('POST /api/v1/cryptocurrencies/sync', () => {
    it('POSITIVE: should synchronize prices for all tracked cryptocurrencies', async () => {
      await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'SOL', name: 'Solana' });

      const quotesMap = new Map();
      quotesMap.set('SOL', {
        symbol: 'SOL',
        name: 'Solana',
        price: 175.5,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      });

      jest.spyOn(cmcService, 'getQuotes').mockResolvedValueOnce(quotesMap);

      const res = await request(app)
        .post('/api/v1/cryptocurrencies/sync')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updated).toBe(1);
    });

    it('NEGATIVE: should return 503 if external CMC network is unreachable during bulk sync', async () => {
      await request(app)
        .post('/api/v1/cryptocurrencies')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ symbol: 'TON', name: 'Toncoin' });

      jest.spyOn(cmcService, 'getQuotes').mockRejectedValueOnce(
        new ExternalApiError('Unable to reach CoinMarketCap API: Network Error', 503)
      );

      const res = await request(app)
        .post('/api/v1/cryptocurrencies/sync')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
    });
  });
});
