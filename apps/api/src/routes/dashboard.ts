import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, and, count, sql, isNull, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/summary', async (c) => {
  const [productCount] = await db.select({ count: count() }).from(schema.products).where(isNull(schema.products.deletedAt));
  const [unitCount] = await db.select({ count: count() }).from(schema.serialNumbers)
    .where(and(eq(schema.serialNumbers.status, 'in_stock'), isNull(schema.serialNumbers.deletedAt)));

  const [inventory] = await db.select({
    total: sql`COALESCE(SUM(${schema.products.buyPrice}::numeric * 1), 0)`,
  }).from(schema.serialNumbers)
    .innerJoin(schema.products, eq(schema.serialNumbers.productId, schema.products.id))
    .where(and(eq(schema.serialNumbers.status, 'in_stock'), isNull(schema.serialNumbers.deletedAt)));

  const byCategory = await db.select({
    category: schema.categories.name,
    units: count(schema.serialNumbers.id),
    value: sql`COALESCE(SUM(${schema.products.buyPrice}::numeric * 1), 0)`,
  }).from(schema.serialNumbers)
    .innerJoin(schema.products, eq(schema.serialNumbers.productId, schema.products.id))
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(eq(schema.serialNumbers.status, 'in_stock'), isNull(schema.serialNumbers.deletedAt)))
    .groupBy(schema.categories.name);

  const lowThreshold = 5;
  const [lowStockCount] = await db.select({ count: count() }).from(
    db.select({ productId: schema.serialNumbers.productId, cnt: count(schema.serialNumbers.id) })
      .from(schema.serialNumbers)
      .where(and(eq(schema.serialNumbers.status, 'in_stock'), isNull(schema.serialNumbers.deletedAt)))
      .groupBy(schema.serialNumbers.productId)
      .having(sql`count(${schema.serialNumbers.id}) <= ${lowThreshold}`)
      .as('low'),
  );

  return c.json({
    success: true,
    data: {
      total_products: productCount.count,
      total_units_in_stock: unitCount.count,
      inventory_value: Number(inventory.total) || 0,
      by_category: byCategory.map(c => ({
        category: c.category ?? 'Uncategorized',
        units: Number(c.units),
        value: Number(c.value) || 0,
      })),
      low_stock_count: lowStockCount.count,
    },
  });
});

router.get('/low-stock', async (c) => {
  const lowStockThreshold = 5;
  const raw = await db.select({
    productId: schema.serialNumbers.productId,
    count: count(schema.serialNumbers.id),
  }).from(schema.serialNumbers)
    .where(and(eq(schema.serialNumbers.status, 'in_stock'), isNull(schema.serialNumbers.deletedAt)))
    .groupBy(schema.serialNumbers.productId)
    .having(sql`count(${schema.serialNumbers.id}) <= ${lowStockThreshold}`);

  const productIds = raw.map(r => r.productId);
  const products = productIds.length > 0
    ? await db.select().from(schema.products).where(inArray(schema.products.id, productIds))
    : [];

  return c.json({
    success: true,
    data: products.map(p => {
      const r = raw.find(x => x.productId === p.id);
      return { ...p, units_in_stock: Number(r?.count ?? 0) };
    }),
  });
});

router.get('/warranty', async (c) => {
  const sns = await db.select().from(schema.serialNumbers).where(
    and(eq(schema.serialNumbers.status, 'sold'), isNull(schema.serialNumbers.deletedAt)),
  );
  const results = [];
  for (const sn of sns) {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, sn.productId)).limit(1);
    const [category] = product?.categoryId ? await db.select().from(schema.categories).where(eq(schema.categories.id, product.categoryId)).limit(1) : [null];
    const durationDays = category?.warrantyDurationDays ?? 365;
    const expiresAt = sn.soldAt ? new Date(sn.soldAt.getTime() + durationDays * 24 * 60 * 60 * 1000) : null;
    const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
    results.push({
      serial_number: sn.serialNumber, product_name: product?.name, sold_at: sn.soldAt,
      warranty_expires_at: expiresAt, days_remaining: daysRemaining,
      status: !sn.soldAt ? 'not_applicable' : (daysRemaining ?? 0) <= 0 ? 'expired' : 'active',
    });
  }
  return c.json({ success: true, data: results });
});

router.get('/rma', async (c) => {
  const rmas = await db.select().from(schema.rmas).where(isNull(schema.rmas.deletedAt));
  return c.json({ success: true, data: rmas });
});

router.get('/stock-movement', async (c) => {
  const receipts = await db.select().from(schema.goodsReceipts).where(
    and(eq(schema.goodsReceipts.status, 'confirmed'), isNull(schema.goodsReceipts.deletedAt)),
  );
  const issues = await db.select().from(schema.goodsIssues).where(
    and(eq(schema.goodsIssues.status, 'confirmed'), isNull(schema.goodsIssues.deletedAt)),
  );
  return c.json({ success: true, data: { receipts: receipts.length, issues: issues.length } });
});

export default router;
