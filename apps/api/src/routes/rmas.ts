import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, count, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createRmaSchema, updateRmaStatusSchema } from '@wms/shared';
import { generateNumber } from '../utils/number';
import { writeAudit } from '../utils/audit';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/', async (c) => {
  const { page = '1', limit = '20', status, customer_name } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [isNull(schema.rmas.deletedAt)];
  if (status) conditions.push(eq(schema.rmas.status, status));
  if (customer_name) conditions.push(eq(schema.rmas.customerName, customer_name));
  const [total] = await db.select({ count: count() }).from(schema.rmas).where(and(...conditions));
  const items = await db.select().from(schema.rmas).where(and(...conditions)).limit(Number(limit)).offset(offset);
  return c.json({ success: true, data: items, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

router.get('/:id', async (c) => {
  const [rma] = await db.select().from(schema.rmas).where(eq(schema.rmas.id, c.req.param('id'))).limit(1);
  if (!rma) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  const [sn] = await db.select().from(schema.serialNumbers).where(eq(schema.serialNumbers.id, rma.serialNumberId)).limit(1);
  const [product] = sn ? await db.select().from(schema.products).where(eq(schema.products.id, sn.productId)).limit(1) : [null];
  return c.json({ success: true, data: { ...rma, serial_number: sn, product } });
});

router.post('/', requireRole('admin', 'staff'), validate(createRmaSchema), async (c) => {
  const data = c.get('body');
  const user = c.get('user');
  const [sn] = await db.select().from(schema.serialNumbers).where(eq(schema.serialNumbers.id, data.serial_number_id)).limit(1);
  if (!sn || sn.status !== 'sold') {
    return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Serial number must be sold to create RMA' } }, 400);
  }

  const rmaNumber = generateNumber('RMA');
  const [rma] = await db.insert(schema.rmas).values({
    rmaNumber, serialNumberId: data.serial_number_id, customerName: data.customer_name,
    reason: data.reason, createdBy: user.userId, warehouseId: user.warehouseId,
  }).returning();

  await db.update(schema.serialNumbers).set({ status: 'rma', updatedAt: new Date() }).where(eq(schema.serialNumbers.id, data.serial_number_id));
  await writeAudit(c, { action: 'rma.create', entityType: 'rma', entityId: rma.id, newValues: rma });

  return c.json({ success: true, data: rma }, 201);
});

router.put('/:id/status', requireRole('admin', 'staff'), validate(updateRmaStatusSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.get('body');
  const user = c.get('user');
  const [rma] = await db.select().from(schema.rmas).where(eq(schema.rmas.id, id)).limit(1);
  if (!rma) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);

  const completedStatuses = ['completed_replaced', 'completed_repaired', 'rejected'];
  const isCompleted = completedStatuses.includes(data.status);

  // user-roles.md: hanya admin yang memutuskan completed/rejected
  if (isCompleted && user.role !== 'admin') {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat menyelesaikan/menolak RMA' } }, 403);
  }

  if (isCompleted) {
    const newSnStatus = data.status === 'rejected' ? 'sold' : 'in_stock';
    const newCondition = data.status === 'completed_repaired' ? 'refurbished' : undefined;
    const updates: any = { status: newSnStatus, updatedAt: new Date() };
    if (newCondition) updates.condition = newCondition;
    await db.update(schema.serialNumbers).set(updates).where(eq(schema.serialNumbers.id, rma.serialNumberId));
  }

  await db.update(schema.rmas).set({
    status: data.status,
    resolution: data.resolution ?? rma.resolution,
    updatedAt: new Date(),
  }).where(eq(schema.rmas.id, id));

  const [updated] = await db.select().from(schema.rmas).where(eq(schema.rmas.id, id)).limit(1);
  await writeAudit(c, { action: 'rma.status_update', entityType: 'rma', entityId: id, oldValues: rma, newValues: updated });
  return c.json({ success: true, data: updated });
});

export default router;
