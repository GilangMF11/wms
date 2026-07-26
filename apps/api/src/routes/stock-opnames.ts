import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, count, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createStockOpnameSchema, submitOpnameItemsSchema } from '@wms/shared';
import { generateNumber } from '../utils/number';
import { writeAudit } from '../utils/audit';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/', async (c) => {
  const { page = '1', limit = '20', status } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [isNull(schema.stockOpnames.deletedAt)];
  if (status) conditions.push(eq(schema.stockOpnames.status, status));
  const [total] = await db.select({ count: count() }).from(schema.stockOpnames).where(and(...conditions));
  const items = await db.select().from(schema.stockOpnames).where(and(...conditions)).limit(Number(limit)).offset(offset);
  return c.json({ success: true, data: items, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

router.get('/:id', async (c) => {
  const [opname] = await db.select().from(schema.stockOpnames).where(eq(schema.stockOpnames.id, c.req.param('id'))).limit(1);
  if (!opname) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  const items = await db.select().from(schema.stockOpnameItems).where(eq(schema.stockOpnameItems.opnameId, opname.id));
  return c.json({ success: true, data: { ...opname, items } });
});

router.post('/', requireRole('admin', 'staff'), validate(createStockOpnameSchema), async (c) => {
  const data = c.get('body');
  const user = c.get('user');
  const opnameNumber = generateNumber('SO', new Date(data.opname_date ?? Date.now()));
  const [opname] = await db.insert(schema.stockOpnames).values({
    opnameNumber, opnameDate: data.opname_date ? new Date(data.opname_date) : new Date(),
    status: 'draft', warehouseId: user.warehouseId,
  }).returning();

  const serialNumbers = await db.select({
    productId: schema.serialNumbers.productId,
  }).from(schema.serialNumbers).where(
    and(eq(schema.serialNumbers.status, 'in_stock'), eq(schema.serialNumbers.warehouseId, user.warehouseId)),
  );

  const counts = new Map<string, number>();
  for (const sn of serialNumbers) {
    counts.set(sn.productId, (counts.get(sn.productId) ?? 0) + 1);
  }

  const items = [...counts.entries()].map(([productId, qty]) => ({
    opnameId: opname.id, productId, systemQuantity: qty, physicalQuantity: 0, difference: 0,
  }));

  if (items.length > 0) await db.insert(schema.stockOpnameItems).values(items);

  const savedItems = await db.select().from(schema.stockOpnameItems).where(eq(schema.stockOpnameItems.opnameId, opname.id));
  await writeAudit(c, { action: 'stock_opname.create', entityType: 'stock_opname', entityId: opname.id, newValues: opname });
  return c.json({ success: true, data: { ...opname, items: savedItems } }, 201);
});

router.put('/:id/items', requireRole('admin', 'staff'), validate(submitOpnameItemsSchema), async (c) => {
  const id = c.req.param('id');
  const [opname] = await db.select().from(schema.stockOpnames).where(eq(schema.stockOpnames.id, id)).limit(1);
  if (!opname) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  if (opname.status !== 'draft') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Only draft opname can be updated' } }, 400);

  const data = c.get('body');
  for (const item of data.items) {
    const [existing] = await db.select().from(schema.stockOpnameItems).where(
      and(eq(schema.stockOpnameItems.opnameId, id), eq(schema.stockOpnameItems.productId, item.product_id)),
    ).limit(1);

    const difference = item.physical_quantity - (existing?.systemQuantity ?? 0);

    if (existing) {
      await db.update(schema.stockOpnameItems).set({
        physicalQuantity: item.physical_quantity, difference,
      }).where(eq(schema.stockOpnameItems.id, existing.id));
    }
  }

  const items = await db.select().from(schema.stockOpnameItems).where(eq(schema.stockOpnameItems.opnameId, id));
  return c.json({ success: true, data: items });
});

router.post('/:id/submit', requireRole('admin', 'staff'), async (c) => {
  const id = c.req.param('id');
  await db.update(schema.stockOpnames).set({ status: 'review', updatedAt: new Date() }).where(eq(schema.stockOpnames.id, id));
  await writeAudit(c, { action: 'stock_opname.submit', entityType: 'stock_opname', entityId: id });
  return c.json({ success: true, data: null });
});

router.post('/:id/approve', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const [opname] = await db.select().from(schema.stockOpnames).where(eq(schema.stockOpnames.id, id)).limit(1);
  if (!opname || opname.status !== 'review') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Opname must be in review' } }, 400);

  const items = await db.select().from(schema.stockOpnameItems).where(eq(schema.stockOpnameItems.opnameId, id));

  for (const item of items) {
    if (item.difference === 0) continue;

    if (item.difference > 0) {
      // Surplus fisik: buat serial baru nyata, adjustment IN mencatat serial itu sendiri.
      for (let i = 0; i < item.difference; i++) {
        const [newSn] = await db.insert(schema.serialNumbers).values({
          productId: item.productId, serialNumber: `ADJ-${generateNumber('SN')}`,
          condition: 'new', status: 'in_stock', warehouseId: opname.warehouseId,
        }).returning();
        await db.insert(schema.stockAdjustments).values({
          serialNumberId: newSn.id,
          adjustmentType: 'IN', quantity: 1, reason: `Stock opname ${opname.opnameNumber}`,
          opnameId: id, createdBy: user.userId, warehouseId: opname.warehouseId,
        });
      }
    } else {
      // Kekurangan fisik: serial hilang -> soft-delete (bukan 'sold'), adjustment OUT.
      const missing = Math.abs(item.difference);
      const existingSns = await db.select().from(schema.serialNumbers).where(
        and(
          eq(schema.serialNumbers.productId, item.productId),
          eq(schema.serialNumbers.status, 'in_stock'),
          isNull(schema.serialNumbers.deletedAt),
        ),
      ).limit(missing);

      for (let i = 0; i < missing && i < existingSns.length; i++) {
        await db.update(schema.serialNumbers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(schema.serialNumbers.id, existingSns[i].id));
        await db.insert(schema.stockAdjustments).values({
          serialNumberId: existingSns[i].id, adjustmentType: 'OUT', quantity: 1,
          reason: `Stock opname ${opname.opnameNumber}`, opnameId: id,
          createdBy: user.userId, warehouseId: opname.warehouseId,
        });
      }
    }
  }

  await db.update(schema.stockOpnames).set({ status: 'approved', approvedBy: user.userId, updatedAt: new Date() }).where(eq(schema.stockOpnames.id, id));
  await writeAudit(c, { action: 'stock_opname.approve', entityType: 'stock_opname', entityId: id, newValues: { status: 'approved' } });
  return c.json({ success: true, data: null });
});

export default router;
