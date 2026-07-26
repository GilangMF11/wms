import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, count, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createGoodsReceiptSchema, updateGoodsReceiptSchema, confirmReceiptSerialSchema } from '@wms/shared';
import { generateNumber } from '../utils/number';
import { writeAudit } from '../utils/audit';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/', async (c) => {
  const { page = '1', limit = '20', status, supplier, date_from, date_to } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [isNull(schema.goodsReceipts.deletedAt)];
  if (status) conditions.push(eq(schema.goodsReceipts.status, status));
  if (supplier) conditions.push(eq(schema.goodsReceipts.supplierName, supplier));
  const [total] = await db.select({ count: count() }).from(schema.goodsReceipts).where(and(...conditions));
  const receipts = await db.select().from(schema.goodsReceipts).where(and(...conditions)).limit(Number(limit)).offset(offset).orderBy(schema.goodsReceipts.createdAt);
  return c.json({ success: true, data: receipts, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

router.get('/:id', async (c) => {
  const [receipt] = await db.select().from(schema.goodsReceipts).where(eq(schema.goodsReceipts.id, c.req.param('id'))).limit(1);
  if (!receipt) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  const items = await db.select().from(schema.goodsReceiptItems).where(eq(schema.goodsReceiptItems.receiptId, receipt.id));
  return c.json({ success: true, data: { ...receipt, items } });
});

router.post('/', requireRole('admin', 'staff'), validate(createGoodsReceiptSchema), async (c) => {
  const data = c.get('body');
  const user = c.get('user');
  const receiptNumber = generateNumber('GR', new Date(data.receipt_date ?? Date.now()));
  const [receipt] = await db.insert(schema.goodsReceipts).values({
    receiptNumber, supplierName: data.supplier_name,
    receiptDate: data.receipt_date ? new Date(data.receipt_date) : new Date(),
    notes: data.notes, createdBy: user.userId, warehouseId: user.warehouseId,
  }).returning();
  await db.insert(schema.goodsReceiptItems).values(
    data.items.map(i => ({ receiptId: receipt.id, productId: i.product_id, quantity: i.quantity, unitPrice: String(i.unit_price) })),
  );
  const items = await db.select().from(schema.goodsReceiptItems).where(eq(schema.goodsReceiptItems.receiptId, receipt.id));
  await writeAudit(c, { action: 'goods_receipt.create', entityType: 'goods_receipt', entityId: receipt.id, newValues: receipt });
  return c.json({ success: true, data: { ...receipt, items } }, 201);
});

router.put('/:id', requireRole('admin', 'staff'), validate(updateGoodsReceiptSchema), async (c) => {
  const id = c.req.param('id');
  const [receipt] = await db.select().from(schema.goodsReceipts).where(eq(schema.goodsReceipts.id, id)).limit(1);
  if (!receipt) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  if (receipt.status !== 'draft') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Only draft receipts can be edited' } }, 400);

  const data = c.get('body');
  await db.update(schema.goodsReceipts).set({
    supplierName: data.supplier_name, receiptDate: data.receipt_date ? new Date(data.receipt_date) : undefined,
    notes: data.notes, updatedAt: new Date(),
  } as any).where(eq(schema.goodsReceipts.id, id));

  if (data.items) {
    await db.delete(schema.goodsReceiptItems).where(eq(schema.goodsReceiptItems.receiptId, id));
    await db.insert(schema.goodsReceiptItems).values(
      data.items.map(i => ({ receiptId: id, productId: i.product_id, quantity: i.quantity, unitPrice: String(i.unit_price) })),
    );
  }

  const items = await db.select().from(schema.goodsReceiptItems).where(eq(schema.goodsReceiptItems.receiptId, id));
  const [updated] = await db.select().from(schema.goodsReceipts).where(eq(schema.goodsReceipts.id, id)).limit(1);
  return c.json({ success: true, data: { ...updated, items } });
});

router.post('/:id/confirm', requireRole('admin', 'staff'), validate(confirmReceiptSerialSchema), async (c) => {
  const id = c.req.param('id');
  const [receipt] = await db.select().from(schema.goodsReceipts).where(eq(schema.goodsReceipts.id, id)).limit(1);
  if (!receipt) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  if (receipt.status !== 'draft') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Already confirmed' } }, 400);

  const data = c.get('body');
  const items = await db.select().from(schema.goodsReceiptItems).where(eq(schema.goodsReceiptItems.receiptId, id));

  for (const sn of data.serial_numbers) {
    const item = items.find(i => i.id === sn.item_id);
    if (!item) continue;
    await db.insert(schema.serialNumbers).values({
      productId: item.productId, serialNumber: sn.serial_number,
      condition: sn.condition, status: 'in_stock', warehouseId: receipt.warehouseId,
    });
  }

  await db.update(schema.goodsReceipts).set({ status: 'confirmed', updatedAt: new Date() }).where(eq(schema.goodsReceipts.id, id));
  const [updated] = await db.select().from(schema.goodsReceipts).where(eq(schema.goodsReceipts.id, id)).limit(1);
  await writeAudit(c, { action: 'goods_receipt.confirm', entityType: 'goods_receipt', entityId: id, newValues: updated });
  return c.json({ success: true, data: updated });
});

router.post('/:id/cancel', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const [receipt] = await db.select().from(schema.goodsReceipts).where(eq(schema.goodsReceipts.id, id)).limit(1);
  if (!receipt || receipt.status !== 'confirmed') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Can only cancel confirmed receipts' } }, 400);
  await db.update(schema.goodsReceipts).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(schema.goodsReceipts.id, id));
  await writeAudit(c, { action: 'goods_receipt.cancel', entityType: 'goods_receipt', entityId: id, oldValues: receipt });
  return c.json({ success: true, data: null });
});

export default router;
