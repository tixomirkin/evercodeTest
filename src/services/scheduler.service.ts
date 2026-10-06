import { CryptoService } from './crypto.service';
import { config } from '../config';

export class BackgroundSyncService {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private active = false;

  constructor(
    private cryptoService: CryptoService = new CryptoService(),
    private intervalMs: number = config.SYNC_INTERVAL_MS,
    private enabled: boolean = config.SYNC_ENABLED
  ) {}

  public start(): void {
    if (!this.enabled) {
      console.log('[BackgroundSync] Background synchronization is disabled by configuration.');
      return;
    }

    if (this.active) {
      console.log('[BackgroundSync] Scheduler is already active.');
      return;
    }

    this.active = true;
    console.log(`[BackgroundSync] Started background sync every ${this.intervalMs}ms.`);

    this.timer = setInterval(async () => {
      await this.runSyncCycle();
    }, this.intervalMs);

    // Optional unref so timer doesn't prevent Node process exit if force exit
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  public async runSyncCycle(): Promise<{ updated: number; failed: number; total: number } | null> {
    if (this.isProcessing) {
      console.log('[BackgroundSync] Previous sync cycle still running, skipping this tick.');
      return null;
    }

    this.isProcessing = true;
    try {
      console.log('[BackgroundSync] Running scheduled price synchronization...');
      const result = await this.cryptoService.syncAllPrices();
      console.log(
        `[BackgroundSync] Synchronization completed. Updated: ${result.updated}, Failed: ${result.failed}, Total: ${result.total}`
      );
      return result;
    } catch (error: any) {
      console.error('[BackgroundSync] Error during background synchronization:', error.message || error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  public async stop(): Promise<void> {
    if (!this.active) return;

    console.log('[BackgroundSync] Stopping background price synchronization scheduler...');
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.active = false;

    // Wait if a sync operation is currently in progress
    let waitCount = 0;
    while (this.isProcessing && waitCount < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      waitCount++;
    }

    console.log('[BackgroundSync] Background scheduler stopped successfully.');
  }

  public isRunning(): boolean {
    return this.active;
  }
}

export const backgroundSyncService = new BackgroundSyncService();
