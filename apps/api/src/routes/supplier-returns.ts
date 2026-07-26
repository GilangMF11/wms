import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, count, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createSupplierReturnSchema, updateSupplierReturnStatusSchema } from '@wms/shared';
import { generateNumber } from '../utils/number';
import { writeAudit } from '../utils/audit';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/', async (c) => {
  const { page = '1', limit = '20', status } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [isNull(schema.supplierReturns.deletedAt)];
  if (status) conditions.push(eq(schema.supplierReturns.status, status));
  const [total] = await db.select({ count: count() }).from(schema.supplierReturns).where(and(...conditions));
  const items = await db.select().from(schema.supplierReturns).where(and(...conditions)).limit(Number(limit)).offset(offset);
  return c.json({ success: true, data: items, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

router.post('/', requireRole('admin', 'staff'), validate(createSupplierReturnSchema), async (c) => {
  const data = c.get('body');
  const user = c.get('user');
  const [sn] = await db.select().from(schema.serialNumbers).where(eq(schema.serialNumbers.id, data.serial_number_id)).limit(1);
  if (!sn) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Serial number not found' } }, 404);

  const returnNumber = generateNumber('SR');
  const [ret] = await db.insert(schema.supplierReturns).values({
    returnNumber, serialNumberId: data.serial_number_id, supplierName: data.supplier_name,
    reason: data.reason, createdBy: user.userId, warehouseId: user.warehouseId,
  }).returning();
  await writeAudit(c, { action: 'supplier_return.create', entityType: 'supplier_return', entityId: ret.id, newValues: ret });
  return c.json({ success: true, data: ret }, 201);
});

router.put('/:id', requireRole('admin'), validate(updateSupplierReturnStatusSchema), async (c) => {
  const id = c.req.param('id');
  const [old] = await db.select().from(schema.supplierReturns).where(eq(schema.supplierReturns.id, id)).limit(1);
  if (!old) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  const data = c.get('body');
  const [ret] = await db.update(schema.supplierReturns).set({ status: data.status, updatedAt: new Date() })
    .where(eq(schema.supplierReturns.id, id)).returning();
  await writeAudit(c, { action: 'supplier_return.status_update', entityType: 'supplier_return', entityId: id, oldValues: old, newValues: ret });
  return c.json({ success: true, data: ret });
});

export default router;
