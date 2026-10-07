import { Router } from 'express';
import { CryptoController } from '../controllers/crypto.controller';
import { validate } from '../middlewares/validate.middleware';
import {
  createCryptoSchema,
  updateCryptoSchema,
  idParamSchema,
  priceHistoryQuerySchema,
} from '../validators/crypto.validator';

export function createCryptoRouter(cryptoController: CryptoController = new CryptoController()): Router {
  const router = Router();

  // Create tracked cryptocurrency
  router.post('/', validate(createCryptoSchema), cryptoController.create);

  // Get all tracked cryptocurrencies
  router.get('/', cryptoController.getAll);

  // Trigger manual sync of all tracked cryptocurrencies
  router.post('/sync', cryptoController.syncAll);

  // Get cryptocurrency details
  router.get('/:id', validate(idParamSchema), cryptoController.getById);

  // Update cryptocurrency
  router.put('/:id', validate(updateCryptoSchema), cryptoController.update);

  // Delete cryptocurrency
  router.delete('/:id', validate(idParamSchema), cryptoController.delete);

  // Fetch current price from CoinMarketCap and record it
  router.post('/:id/price', validate(idParamSchema), cryptoController.fetchPrice);
  router.get('/:id/price', validate(idParamSchema), cryptoController.fetchPrice);

  // Get price history for cryptocurrency
  router.get('/:id/history', validate(priceHistoryQuerySchema), cryptoController.getHistory);

  return router;
}

export const cryptoRouter = createCryptoRouter();
