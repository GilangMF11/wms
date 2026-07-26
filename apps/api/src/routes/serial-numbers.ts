import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, count, isNull, ilike } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createSerialNumberBulkSchema } from '@wms/shared';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/', async (c) => {
  const { serial_number, product_id, status, condition, warehouse_id, page = '1', limit = '20' } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = [isNull(schema.serialNumbers.deletedAt)];
  if (serial_number) conditions.push(ilike(schema.serialNumbers.serialNumber, `%${serial_number}%`));
  if (product_id) conditions.push(eq(schema.serialNumbers.productId, product_id));
  if (status) conditions.push(eq(schema.serialNumbers.status, status));
  if (condition) conditions.push(eq(schema.serialNumbers.condition, condition));
  if (warehouse_id) conditions.push(eq(schema.serialNumbers.warehouseId, warehouse_id));

  const [total] = await db.select({ count: count() }).from(schema.serialNumbers).where(and(...conditions));
  const items = await db.select().from(schema.serialNumbers).where(and(...conditions)).limit(Number(limit)).offset(offset);

  return c.json({ success: true, data: items, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

router.get('/:id', async (c) => {
  const [sn] = await db.select().from(schema.serialNumbers).where(eq(schema.serialNumbers.id, c.req.param('id'))).limit(1);
  if (!sn) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, sn.productId)).limit(1);
  const adjustments = await db.select().from(schema.stockAdjustments).where(eq(schema.stockAdjustments.serialNumberId, sn.id));
  return c.json({ success: true, data: { ...sn, product, adjustments } });
});

router.get('/:id/warranty', async (c) => {
  const [sn] = await db.select().from(schema.serialNumbers).where(eq(schema.serialNumbers.id, c.req.param('id'))).limit(1);
  if (!sn) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, sn.productId)).limit(1);
  const [category] = product?.categoryId
    ? await db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).limit(1)
    : [null];

  const durationDays = category?.warrantyDurationDays ?? 365;
  const expiresAt = sn.soldAt ? new Date(sn.soldAt.getTime() + durationDays * 24 * 60 * 60 * 1000) : null;
  const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
  const warrantyStatus = !sn.soldAt ? 'not_applicable' : daysRemaining! <= 0 ? 'expired' : 'active';

  return c.json({
    success: true,
    data: {
      serial_number: sn.serialNumber,
      product_name: product?.name,
      sold_at: sn.soldAt,
      warranty_expires_at: expiresAt,
      days_remaining: daysRemaining,
      status: warrantyStatus,
    },
  });
});

router.post('/bulk', requireRole('admin', 'staff'), validate(createSerialNumberBulkSchema), async (c) => {
  const data = c.get('body');
  const items = await db.insert(schema.serialNumbers).values(
    data.serial_numbers.map(s => ({
      productId: s.product_id, serialNumber: s.serial_number,
      condition: s.condition, warehouseId: s.warehouse_id,
    })),
  ).returning();
  return c.json({ success: true, data: items }, 201);
});

export default router;
