import { Hono } from 'hono';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { v4 as uuid } from 'uuid';

const router = new Hono();
router.use('*', authMiddleware);
router.use('*', requireRole('admin'));

const UPLOAD_DIR = join(import.meta.dirname, '..', '..', 'uploads');
await mkdir(UPLOAD_DIR, { recursive: true });

router.post('/', async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File | undefined;

  if (!file) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File required' } }, 400);
  }

  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = extname(file.name).toLowerCase();
  if (!allowed.includes(ext)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Format: jpg, png, webp' } }, 400);
  }

  if (file.size > 2 * 1024 * 1024) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Maks 2MB' } }, 400);
  }

  const filename = `${uuid()}${ext}`;
  const filepath = join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return c.json({ success: true, data: { url: `/uploads/${filename}` } }, 201);
});

export default router;
