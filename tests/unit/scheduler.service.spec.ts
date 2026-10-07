import { BackgroundSyncService } from '../../src/services/scheduler.service';
import { CryptoService } from '../../src/services/crypto.service';

describe('BackgroundSyncService Unit Tests', () => {
  let mockCryptoService: jest.Mocked<CryptoService>;
  let scheduler: BackgroundSyncService;

  beforeEach(() => {
    jest.useFakeTimers();
    mockCryptoService = {
      syncAllPrices: jest.fn(),
    } as any;
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.stop();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should start scheduler and periodically trigger price synchronization', async () => {
    mockCryptoService.syncAllPrices.mockResolvedValue({ updated: 2, failed: 0, total: 2 });
    scheduler = new BackgroundSyncService(mockCryptoService, 1000, true);

    expect(scheduler.isRunning()).toBe(false);
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    // Fast-forward 1 second
    jest.advanceTimersByTime(1000);
    // Allow any pending microtasks to run
    await Promise.resolve();

    expect(mockCryptoService.syncAllPrices).toHaveBeenCalledTimes(1);

    // Fast-forward another second
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(mockCryptoService.syncAllPrices).toHaveBeenCalledTimes(2);
  });

  it('should gracefully handle external API errors during background sync without throwing', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCryptoService.syncAllPrices.mockRejectedValueOnce(new Error('CoinMarketCap unavailable'));
    scheduler = new BackgroundSyncService(mockCryptoService, 5000, true);

    const result = await scheduler.runSyncCycle();

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BackgroundSync] Error during background synchronization:'),
      'CoinMarketCap unavailable'
    );
    consoleErrorSpy.mockRestore();
  });

  it('should stop the scheduler properly and reset active state on graceful shutdown', async () => {
    scheduler = new BackgroundSyncService(mockCryptoService, 5000, true);
    scheduler.start();
    expect(scheduler.isRunning()).toBe(true);

    await scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);

    // Timer shouldn't trigger after stop
    jest.advanceTimersByTime(10000);
    expect(mockCryptoService.syncAllPrices).not.toHaveBeenCalled();
  });

  it('should not start if disabled by configuration', () => {
    scheduler = new BackgroundSyncService(mockCryptoService, 5000, false);
    scheduler.start();
    expect(scheduler.isRunning()).toBe(false);
  });
});
