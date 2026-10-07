import { z } from 'zod';

export const createCryptoSchema = z.object({
  body: z.object({
    symbol: z
      .string({ message: 'Symbol is required' })
      .trim()
      .min(1, 'Symbol cannot be empty')
      .max(15, 'Symbol cannot exceed 15 characters')
      .regex(/^[A-Za-z0-9]+$/, 'Symbol must only contain alphanumeric characters')
      .transform((val) => val.toUpperCase()),
    name: z
      .string({ message: 'Name is required' })
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name cannot exceed 100 characters'),
  }),
});

export const updateCryptoSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer'),
  }),
  body: z
    .object({
      symbol: z
        .string()
        .trim()
        .min(1, 'Symbol cannot be empty')
        .max(15, 'Symbol cannot exceed 15 characters')
        .regex(/^[A-Za-z0-9]+$/, 'Symbol must only contain alphanumeric characters')
        .transform((val) => val.toUpperCase())
        .optional(),
      name: z
        .string()
        .trim()
        .min(1, 'Name cannot be empty')
        .max(100, 'Name cannot exceed 100 characters')
        .optional(),
    })
    .refine((data) => data.symbol !== undefined || data.name !== undefined, {
      message: 'At least one field (symbol or name) must be provided for update',
    }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer'),
  }),
});

export const priceHistoryQuerySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID must be a positive integer'),
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    fromDate: z
      .string()
      .datetime({ message: 'fromDate must be a valid ISO 8601 date string' })
      .optional(),
    toDate: z
      .string()
      .datetime({ message: 'toDate must be a valid ISO 8601 date string' })
      .optional(),
    order: z.enum(['asc', 'desc']).default('desc').optional(),
  }),
});
