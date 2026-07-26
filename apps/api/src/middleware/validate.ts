import { createMiddleware } from 'hono/factory';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return createMiddleware(async (c, next) => {
    const body = await c.req.json().catch(() => ({}));
    const result = schema.safeParse(body);
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: result.error.issues,
          },
        },
        400,
      );
    }
    c.set('body', result.data);
    await next();
  });
}
