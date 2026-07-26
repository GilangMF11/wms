import { createMiddleware } from 'hono/factory';

type Role = 'admin' | 'staff' | 'owner';

export function requireRole(...roles: Role[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, 403);
    }
    await next();
  });
}
