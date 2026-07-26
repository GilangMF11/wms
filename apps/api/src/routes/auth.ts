import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, lte } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLoginSchema, authRefreshSchema } from '@wms/shared';
import { v4 as uuid } from 'uuid';

const router = new Hono();

router.post('/login', validate(authLoginSchema), async (c) => {
  const { email, password } = c.get('body');
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !(await compare(password, user.passwordHash))) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }, 401);
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role, warehouseId: user.warehouseId ?? undefined });
  const tokenId = uuid();
  const refreshToken = signRefreshToken({ userId: user.id, tokenId });
  const refreshTokenHash = await hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(schema.refreshTokens).values({ userId: user.id, tokenHash: refreshTokenHash, expiresAt });

  return c.json({
    success: true,
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, full_name: user.fullName, role: user.role },
    },
  });
});

router.post('/refresh', validate(authRefreshSchema), async (c) => {
  const { refresh_token } = c.get('body');
  let payload;
  try {
    payload = verifyRefreshToken(refresh_token);
  } catch {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } }, 401);
  }

  const tokens = await db.select().from(schema.refreshTokens).where(
    eq(schema.refreshTokens.userId, payload.userId),
  );

  let valid = false;
  for (const t of tokens) {
    if (await compare(refresh_token, t.tokenHash)) {
      valid = true;
      await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.id, t.id));
      break;
    }
  }

  if (!valid) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } }, 401);
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, payload.userId)).limit(1);
  if (!user) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } }, 401);
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role, warehouseId: user.warehouseId ?? undefined });
  const newTokenId = uuid();
  const newRefreshToken = signRefreshToken({ userId: user.id, tokenId: newTokenId });
  const newRefreshTokenHash = await hash(newRefreshToken, 10);
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(schema.refreshTokens).values({ userId: user.id, tokenHash: newRefreshTokenHash, expiresAt: newExpiresAt });

  return c.json({
    success: true,
    data: { access_token: accessToken, refresh_token: newRefreshToken },
  });
});

router.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, user.userId));
  return c.json({ success: true, data: null });
});

export default router;
