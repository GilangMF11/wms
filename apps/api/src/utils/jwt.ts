import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function signAccessToken(payload: { userId: string; role: string; warehouseId?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; warehouseId?: string };
}

export function signRefreshToken(payload: { userId: string; tokenId: string }) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; tokenId: string };
}
