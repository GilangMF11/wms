import { Hono } from 'hono';
import { db, schema } from '../db';
import { desc, eq, and, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = new Hono();

router.use('*', authMiddleware);
router.use('*', requireRole('admin', 'owner'));

router.get('/', async (c) => {
  const { page = '1', limit = '50', user_id, entity_type, action, date_from, date_to } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);
  const conditions: any[] = [];

  if (user_id) conditions.push(eq(schema.auditLog.userId, user_id));
  if (entity_type) conditions.push(eq(schema.auditLog.entityType, entity_type));
  if (action) conditions.push(eq(schema.auditLog.action, action));

  const [total] = await db.select({ count: count() }).from(schema.auditLog).where(and(...conditions));
  const logs = await db.select().from(schema.auditLog)
    .where(and(...conditions))
    .limit(Number(limit)).offset(offset)
    .orderBy(desc(schema.auditLog.createdAt));

  return c.json({ success: true, data: logs, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

export default router;
