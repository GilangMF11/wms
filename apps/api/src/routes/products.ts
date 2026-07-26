import { Hono } from 'hono';
import { db, schema } from '../db';
import { eq, ilike, count, and, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema, createCategorySchema } from '@wms/shared';
import { writeAudit } from '../utils/audit';

const router = new Hono();
router.use('*', authMiddleware);

router.get('/', async (c) => {
  const { search, category_id, brand, page = '1', limit = '20' } = c.req.query();
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = [isNull(schema.products.deletedAt)];
  if (search) conditions.push(ilike(schema.products.name, `%${search}%`));
  if (category_id) conditions.push(eq(schema.products.categoryId, category_id));
  if (brand) conditions.push(ilike(schema.products.brand, `%${brand}%`));

  const [total] = await db.select({ count: count() }).from(schema.products).where(and(...conditions));
  const products = await db.select().from(schema.products).where(and(...conditions)).limit(Number(limit)).offset(offset);

  return c.json({ success: true, data: products, meta: { page: Number(page), limit: Number(limit), total: total.count } });
});

router.get('/:id', async (c) => {
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, c.req.param('id'))).limit(1);
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  const snCount = await db.select({ count: count() }).from(schema.serialNumbers).where(eq(schema.serialNumbers.productId, product.id));
  const bundleItems = product.isBundle
    ? await db.select().from(schema.bundleItems).where(eq(schema.bundleItems.bundleProductId, product.id))
    : [];
  return c.json({ success: true, data: { ...product, total_units: snCount[0].count, bundle_items: bundleItems } });
});

router.post('/', requireRole('admin'), validate(createProductSchema), async (c) => {
  const data = c.get('body');
  const [product] = await db.insert(schema.products).values({
    sku: data.sku, name: data.name, brand: data.brand, categoryId: data.category_id,
    buyPrice: data.buy_price != null ? String(data.buy_price) : null,
    sellPrice: data.sell_price != null ? String(data.sell_price) : null,
    imageUrl: data.image_url, isBundle: data.is_bundle,
  }).returning();
  if (data.is_bundle && data.bundle_items?.length) {
    await db.insert(schema.bundleItems).values(
      data.bundle_items.map(i => ({ bundleProductId: product.id, componentProductId: i.component_product_id, quantity: i.quantity })),
    );
  }
  await writeAudit(c, { action: 'product.create', entityType: 'product', entityId: product.id, newValues: product });
  return c.json({ success: true, data: product }, 201);
});

router.put('/:id', requireRole('admin'), validate(updateProductSchema), async (c) => {
  const id = c.req.param('id');
  const [old] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  if (!old) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);

  const data = c.get('body');
  const [product] = await db.update(schema.products).set({
    sku: data.sku, name: data.name, brand: data.brand, categoryId: data.category_id,
    buyPrice: data.buy_price !== undefined ? String(data.buy_price) : undefined,
    sellPrice: data.sell_price !== undefined ? String(data.sell_price) : undefined,
    imageUrl: data.image_url, isBundle: data.is_bundle, updatedAt: new Date(),
  } as any).where(eq(schema.products.id, id)).returning();

  if (data.is_bundle !== undefined || data.bundle_items !== undefined) {
    await db.delete(schema.bundleItems).where(eq(schema.bundleItems.bundleProductId, id));
    if (data.is_bundle && data.bundle_items?.length) {
      await db.insert(schema.bundleItems).values(
        data.bundle_items.map((i: any) => ({ bundleProductId: id, componentProductId: i.component_product_id, quantity: i.quantity })),
      );
    }
  }

  await writeAudit(c, { action: 'product.update', entityType: 'product', entityId: id, oldValues: old, newValues: product });
  return c.json({ success: true, data: product });
});

router.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  // F-01: produk dengan serial number tidak bisa dihapus
  const [sn] = await db.select({ count: count() }).from(schema.serialNumbers)
    .where(and(eq(schema.serialNumbers.productId, id), isNull(schema.serialNumbers.deletedAt)));
  if (sn.count > 0) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'Produk memiliki serial number, tidak dapat dihapus' } }, 409);
  }
  await db.update(schema.products).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(schema.products.id, id));
  await writeAudit(c, { action: 'product.delete', entityType: 'product', entityId: id });
  return c.json({ success: true, data: null });
});

router.get('/categories/all', async (c) => {
  const cats = await db.select().from(schema.categories).where(isNull(schema.categories.deletedAt));
  return c.json({ success: true, data: cats });
});

router.post('/categories', requireRole('admin'), validate(createCategorySchema), async (c) => {
  const data = c.get('body');
  const [cat] = await db.insert(schema.categories).values({ name: data.name, warrantyDurationDays: data.warranty_duration_days }).returning();
  await writeAudit(c, { action: 'category.create', entityType: 'category', entityId: cat.id, newValues: cat });
  return c.json({ success: true, data: cat }, 201);
});

router.put('/categories/:id', requireRole('admin'), validate(createCategorySchema), async (c) => {
  const id = c.req.param('id');
  const [old] = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
  if (!old) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }, 404);
  const data = c.get('body');
  const [cat] = await db.update(schema.categories).set({
    name: data.name, warrantyDurationDays: data.warranty_duration_days, updatedAt: new Date(),
  }).where(eq(schema.categories.id, id)).returning();
  await writeAudit(c, { action: 'category.update', entityType: 'category', entityId: id, oldValues: old, newValues: cat });
  return c.json({ success: true, data: cat });
});

export default router;
