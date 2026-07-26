import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
const { hash } = bcrypt;
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '@wms/shared';
import { writeAudit } from '../utils/audit';

const router = new Hono();

router.use('*', authMiddleware);
router.use('*', requireRole('admin'));

router.get('/', async (c) => {
  const users = await db.select().from(schema.users).where(isNull(schema.users.deletedAt));
  return c.json({ success: true, data: users.map(u => ({
    id: u.id, email: u.email, full_name: u.fullName, role: u.role,
    warehouse_id: u.warehouseId, is_active: u.isActive, created_at: u.createdAt,
  })) });
});

router.post('/', validate(createUserSchema), async (c) => {
  const data = c.get('body');
  const passwordHash = await hash(data.password, 12);
  const [user] = await db.insert(schema.users).values({
    email: data.email, passwordHash, fullName: data.full_name,
    role: data.role, warehouseId: data.warehouse_id,
  }).returning();
  await writeAudit(c, { action: 'user.create', entityType: 'user', entityId: user.id, newValues: user });
  return c.json({ success: true, data: { id: user.id, email: user.email, full_name: user.fullName, role: user.role } }, 201);
});

router.put('/:id', validate(updateUserSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.get('body');
  const [old] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!old) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  const [user] = await db.update(schema.users).set({
    email: data.email, fullName: data.full_name, role: data.role, warehouseId: data.warehouse_id,
    updatedAt: new Date(),
  }).where(eq(schema.users.id, id)).returning();
  await writeAudit(c, { action: 'user.update', entityType: 'user', entityId: id, oldValues: old, newValues: user });
  return c.json({ success: true, data: { id: user.id, email: user.email, full_name: user.fullName, role: user.role } });
});

router.post('/:id/deactivate', async (c) => {
  const id = c.req.param('id');
  const caller = c.get('user');
  if (caller.userId === id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Tidak dapat menonaktifkan akun sendiri' } }, 403);
  }
  await db.update(schema.users).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.users.id, id));
  await writeAudit(c, { action: 'user.deactivate', entityType: 'user', entityId: id });
  return c.json({ success: true, data: null });
});

export default router;
