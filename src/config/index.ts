import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BEARER_TOKEN: z.string().min(1).default('default-secret-token'),
  CMC_API_KEY: z.string().default(''),
  CMC_BASE_URL: z.string().url().default('https://pro-api.coinmarketcap.com'),
  CMC_TIMEOUT_MS: z.coerce.number().default(10000),
  DB_PATH: z.string().default('./data/crypto_tracker.db'),
  BASE_CURRENCY: z.string().default('USD'),
  SYNC_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default(true),
  SYNC_INTERVAL_MS: z.coerce.number().default(120000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const config = parsed.data;
export type Config = typeof config;
