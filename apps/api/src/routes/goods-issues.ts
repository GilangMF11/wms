import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, count, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createGoodsIssueSchema, updateGoodsIssueSchema } from '@wms/shared';
import { generateNumber } from '../utils/number';
import { writeAudit } from '../utils/audit';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/', async (c) => {
  const { page = '1', limit = '20', status, date_from, date_to } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);
  const conditions = [isNull(schema.goodsIssues.deletedAt)];
  if (status) conditions.push(eq(schema.goodsIssues.status, status));
  const [total] = await db.select({ count: count() }).from(schema.goodsIssues).where(and(...conditions));
  const issues = await db.select().from(schema.goodsIssues).where(and(...conditions)).limit(Number(limit)).offset(offset).orderBy(schema.goodsIssues.createdAt);
  return c.json({ success: true, data: issues, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

router.get('/:id', async (c) => {
  const [issue] = await db.select().from(schema.goodsIssues).where(eq(schema.goodsIssues.id, c.req.param('id'))).limit(1);
  if (!issue) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  const items = await db.select().from(schema.goodsIssueItems).where(eq(schema.goodsIssueItems.issueId, issue.id));
  return c.json({ success: true, data: { ...issue, items } });
});

router.post('/', requireRole('admin', 'staff'), validate(createGoodsIssueSchema), async (c) => {
  const data = c.get('body');
  const user = c.get('user');
  const issueNumber = generateNumber('GI', new Date(data.issue_date ?? Date.now()));

  for (const item of data.items) {
    const [sn] = await db.select().from(schema.serialNumbers).where(eq(schema.serialNumbers.id, item.serial_number_id)).limit(1);
    if (!sn || sn.status !== 'in_stock') {
      return c.json({ success: false, error: { code: 'INVALID_STATE', message: `Serial number ${item.serial_number_id} not available` } }, 400);
    }
  }

  const [issue] = await db.insert(schema.goodsIssues).values({
    issueNumber, issueDate: data.issue_date ? new Date(data.issue_date) : new Date(),
    notes: data.notes, createdBy: user.userId, warehouseId: user.warehouseId,
  }).returning();

  await db.insert(schema.goodsIssueItems).values(
    data.items.map(i => ({ issueId: issue.id, serialNumberId: i.serial_number_id, sellPrice: i.sell_price ? String(i.sell_price) : null })),
  );

  const items = await db.select().from(schema.goodsIssueItems).where(eq(schema.goodsIssueItems.issueId, issue.id));
  await writeAudit(c, { action: 'goods_issue.create', entityType: 'goods_issue', entityId: issue.id, newValues: issue });
  return c.json({ success: true, data: { ...issue, items } }, 201);
});

router.put('/:id', requireRole('admin', 'staff'), validate(updateGoodsIssueSchema), async (c) => {
  const id = c.req.param('id');
  const [issue] = await db.select().from(schema.goodsIssues).where(eq(schema.goodsIssues.id, id)).limit(1);
  if (!issue) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  if (issue.status !== 'draft') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Only draft issues can be edited' } }, 400);

  const data = c.get('body');
  await db.update(schema.goodsIssues).set({
    issueDate: data.issue_date ? new Date(data.issue_date) : undefined,
    notes: data.notes, updatedAt: new Date(),
  } as any).where(eq(schema.goodsIssues.id, id));

  if (data.items) {
    await db.delete(schema.goodsIssueItems).where(eq(schema.goodsIssueItems.issueId, id));
    await db.insert(schema.goodsIssueItems).values(
      data.items.map(i => ({ issueId: id, serialNumberId: i.serial_number_id, sellPrice: i.sell_price ? String(i.sell_price) : null })),
    );
  }

  const items = await db.select().from(schema.goodsIssueItems).where(eq(schema.goodsIssueItems.issueId, id));
  const [updated] = await db.select().from(schema.goodsIssues).where(eq(schema.goodsIssues.id, id)).limit(1);
  return c.json({ success: true, data: { ...updated, items } });
});

router.post('/:id/confirm', requireRole('admin', 'staff'), async (c) => {
  const id = c.req.param('id');
  const [issue] = await db.select().from(schema.goodsIssues).where(eq(schema.goodsIssues.id, id)).limit(1);
  if (!issue) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
  if (issue.status !== 'draft') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Already confirmed' } }, 400);

  const items = await db.select().from(schema.goodsIssueItems).where(eq(schema.goodsIssueItems.issueId, id));
  for (const item of items) {
    await db.update(schema.serialNumbers).set({
      status: 'sold', soldAt: new Date(), updatedAt: new Date(),
    }).where(eq(schema.serialNumbers.id, item.serialNumberId));
  }

  await db.update(schema.goodsIssues).set({ status: 'confirmed', updatedAt: new Date() }).where(eq(schema.goodsIssues.id, id));
  const [updated] = await db.select().from(schema.goodsIssues).where(eq(schema.goodsIssues.id, id)).limit(1);
  await writeAudit(c, { action: 'goods_issue.confirm', entityType: 'goods_issue', entityId: id, newValues: updated });
  return c.json({ success: true, data: updated });
});

router.post('/:id/cancel', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const [issue] = await db.select().from(schema.goodsIssues).where(eq(schema.goodsIssues.id, id)).limit(1);
  if (!issue || issue.status !== 'confirmed') return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'Can only cancel confirmed issues' } }, 400);

  const items = await db.select().from(schema.goodsIssueItems).where(eq(schema.goodsIssueItems.issueId, id));
  for (const item of items) {
    await db.update(schema.serialNumbers).set({ status: 'in_stock', soldAt: null, updatedAt: new Date() }).where(eq(schema.serialNumbers.id, item.serialNumberId));
  }

  await db.update(schema.goodsIssues).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(schema.goodsIssues.id, id));
  await writeAudit(c, { action: 'goods_issue.cancel', entityType: 'goods_issue', entityId: id, oldValues: issue });
  return c.json({ success: true, data: null });
});

export default router;
