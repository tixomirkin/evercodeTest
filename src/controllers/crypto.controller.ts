import { Request, Response, NextFunction } from 'express';
import { CryptoService } from '../services/crypto.service';

export class CryptoController {
  constructor(private cryptoService: CryptoService = new CryptoService()) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const crypto = await this.cryptoService.createCryptocurrency(req.body);
      res.status(201).json({
        success: true,
        data: crypto,
      });
    } catch (error) {
      next(error);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cryptos = await this.cryptoService.getAllCryptocurrencies();
      res.status(200).json({
        success: true,
        count: cryptos.length,
        data: cryptos,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const crypto = await this.cryptoService.getCryptocurrencyById(id);
      res.status(200).json({
        success: true,
        data: crypto,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const updated = await this.cryptoService.updateCryptocurrency(id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      await this.cryptoService.deleteCryptocurrency(id);
      res.status(200).json({
        success: true,
        message: `Cryptocurrency with ID ${id} deleted successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  fetchPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const priceRecord = await this.cryptoService.fetchAndSavePrice(id);
      res.status(200).json({
        success: true,
        data: priceRecord,
      });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const query = (req as any).validatedQuery || req.query;

      const result = await this.cryptoService.getPriceHistory(id, {
        limit: query.limit ? Number(query.limit) : undefined,
        page: query.page ? Number(query.page) : undefined,
        fromDate: query.fromDate ? String(query.fromDate) : undefined,
        toDate: query.toDate ? String(query.toDate) : undefined,
        order: query.order ? (String(query.order).toLowerCase() as 'asc' | 'desc') : undefined,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  syncAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.cryptoService.syncAllPrices();
      res.status(200).json({
        success: true,
        message: 'Prices synchronized successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
