import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../utils/jwt';

export const authMiddleware = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, 401);
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401);
  }
});
