import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../errors/app-error';

export function validate(schema: ZodSchema<any>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace with sanitized/transformed values
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) (req as any).validatedQuery = parsed.query;
      if (parsed.params !== undefined) (req as any).validatedParams = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        next(new BadRequestError('Validation error', errorDetails));
        return;
      }
      next(error);
    }
  };
}
