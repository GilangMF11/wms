import { db, schema } from './index';
import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
const { hash } = bcrypt;

const {
  warehouses, users, categories, products, bundleItems,
  serialNumbers, goodsReceipts, goodsReceiptItems,
  goodsIssues, goodsIssueItems, rmas, supplierReturns,
  stockOpnames, stockOpnameItems, stockAdjustments,
} = schema;

// Bersihkan data (idempotent re-seed)
await db.delete(stockAdjustments);
await db.delete(stockOpnameItems);
await db.delete(stockOpnames);
await db.delete(goodsIssueItems);
await db.delete(goodsIssues);
await db.delete(rmas);
await db.delete(supplierReturns);
await db.delete(serialNumbers);
await db.delete(goodsReceiptItems);
await db.delete(goodsReceipts);
await db.delete(bundleItems);
await db.delete(products);
await db.delete(categories);
// Keep: warehouses, users

// 1. Warehouse
const [wh] = await db.insert(warehouses).values({
  name: 'Gudang Utama', code: 'WH001', address: 'Jl. Elektronik No. 1, Jakarta',
}).onConflictDoNothing().returning();

const warehouseId = wh?.id || (await db.select().from(warehouses).limit(1).then(r => r[0]?.id));
if (!warehouseId) throw new Error('No warehouse found');

// 2. Users
const pw = await hash('admin123', 12);
const staffPw = await hash('staff123', 12);
const ownerPw = await hash('owner123', 12);

await db.insert(users).values([
  { email: 'admin@toko.com', passwordHash: pw, fullName: 'Admin Gudang', role: 'admin', warehouseId },
  { email: 'staff@toko.com', passwordHash: staffPw, fullName: 'Budi Prasetyo', role: 'staff', warehouseId },
  { email: 'owner@toko.com', passwordHash: ownerPw, fullName: 'Ibu Sari', role: 'owner', warehouseId },
]).onConflictDoNothing();

// 3. Categories
const catRows = await db.insert(categories).values([
  { name: 'Smartphone', warrantyDurationDays: 365 },
  { name: 'Laptop', warrantyDurationDays: 730 },
  { name: 'Tablet', warrantyDurationDays: 365 },
  { name: 'Audio', warrantyDurationDays: 365 },
  { name: 'Aksesoris', warrantyDurationDays: 90 },
  { name: 'TV', warrantyDurationDays: 730 },
  { name: 'Kamera', warrantyDurationDays: 365 },
  { name: 'Gaming', warrantyDurationDays: 365 },
]).returning();

type Cat = typeof catRows[number];
const byName: Record<string, string> = {};
for (const c of catRows) byName[c.name] = c.id;

// 4. Products
const prodRows = await db.insert(products).values([
  { sku: 'HP-S24U-001', name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', categoryId: byName.Smartphone, buyPrice: '16200000', sellPrice: '19500000' },
  { sku: 'HP-IP15-001', name: 'iPhone 15 Pro Max', brand: 'Apple', categoryId: byName.Smartphone, buyPrice: '18400000', sellPrice: '22000000' },
  { sku: 'HP-A76-001', name: 'Samsung Galaxy A76', brand: 'Samsung', categoryId: byName.Smartphone, buyPrice: '4200000', sellPrice: '5500000' },
  { sku: 'LP-MBA3-001', name: 'MacBook Air M3', brand: 'Apple', categoryId: byName.Laptop, buyPrice: '15800000', sellPrice: '18900000' },
  { sku: 'LP-ASV15-001', name: 'ASUS Vivobook 15', brand: 'ASUS', categoryId: byName.Laptop, buyPrice: '7200000', sellPrice: '8900000' },
  { sku: 'TB-IPAD-001', name: 'iPad Air M2', brand: 'Apple', categoryId: byName.Tablet, buyPrice: '8200000', sellPrice: '9900000' },
  { sku: 'TB-SGT-001', name: 'Samsung Galaxy Tab S10', brand: 'Samsung', categoryId: byName.Tablet, buyPrice: '6800000', sellPrice: '8200000' },
  { sku: 'TV-LG55-001', name: 'LG OLED 55" C4', brand: 'LG', categoryId: byName.TV, buyPrice: '14500000', sellPrice: '17900000' },
  { sku: 'TV-SAM65-001', name: 'Samsung QLED 65"', brand: 'Samsung', categoryId: byName.TV, buyPrice: '9800000', sellPrice: '12500000' },
  { sku: 'AU-AIRP5-001', name: 'AirPods Pro 2nd Gen', brand: 'Apple', categoryId: byName.Audio, buyPrice: '2800000', sellPrice: '3500000' },
  { sku: 'KM-SONY-001', name: 'Sony Alpha a7 IV', brand: 'Sony', categoryId: byName.Kamera, buyPrice: '23500000', sellPrice: '28000000' },
  { sku: 'GM-PS5-001', name: 'PlayStation 5 Slim', brand: 'Sony', categoryId: byName.Gaming, buyPrice: '6500000', sellPrice: '7800000' },
  { sku: 'AK-CC-001', name: 'Casing Clear Samsung A Series', brand: 'Ringke', categoryId: byName.Aksesoris, buyPrice: '35000', sellPrice: '65000' },
  { sku: 'AK-TG-001', name: 'Tempered Glass Universal', brand: 'Hippo', categoryId: byName.Aksesoris, buyPrice: '15000', sellPrice: '35000' },
]).returning();

type Prod = typeof prodRows[number];
const bySku: Record<string, Prod> = {};
for (const p of prodRows) bySku[p.sku] = p;

// 5. Goods Receipt #1 (confirmed) — Samsung + Apple smartphones
const gr1 = await db.insert(goodsReceipts).values({
  receiptNumber: 'GR-260725-0001',
  supplierName: 'PT Samsung Electronics Indonesia',
  receiptDate: new Date('2026-07-20'),
  status: 'confirmed',
  notes: 'PO #PO2607-001',
  warehouseId,
}).returning().then(r => r[0]);

await db.insert(goodsReceiptItems).values([
  { receiptId: gr1.id, productId: bySku['HP-S24U-001'].id, quantity: 5, unitPrice: '16200000' },
  { receiptId: gr1.id, productId: bySku['HP-A76-001'].id, quantity: 10, unitPrice: '4200000' },
  { receiptId: gr1.id, productId: bySku['LP-MBA3-001'].id, quantity: 3, unitPrice: '15800000' },
  { receiptId: gr1.id, productId: bySku['LP-ASV15-001'].id, quantity: 8, unitPrice: '7200000' },
  { receiptId: gr1.id, productId: bySku['GM-PS5-001'].id, quantity: 4, unitPrice: '6500000' },
  { receiptId: gr1.id, productId: bySku['AK-CC-001'].id, quantity: 50, unitPrice: '35000' },
  { receiptId: gr1.id, productId: bySku['AK-TG-001'].id, quantity: 100, unitPrice: '15000' },
]);

for (let i = 0; i < 5; i++) await db.insert(serialNumbers).values({ productId: bySku['HP-S24U-001'].id, serialNumber: `S24U-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 10; i++) await db.insert(serialNumbers).values({ productId: bySku['HP-A76-001'].id, serialNumber: `A76-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 3; i++) await db.insert(serialNumbers).values({ productId: bySku['LP-MBA3-001'].id, serialNumber: `MBA3-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 8; i++) await db.insert(serialNumbers).values({ productId: bySku['LP-ASV15-001'].id, serialNumber: `ASV15-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 4; i++) await db.insert(serialNumbers).values({ productId: bySku['GM-PS5-001'].id, serialNumber: `PS5-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 50; i++) await db.insert(serialNumbers).values({ productId: bySku['AK-CC-001'].id, serialNumber: `CC-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 100; i++) await db.insert(serialNumbers).values({ productId: bySku['AK-TG-001'].id, serialNumber: `TG-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });

// 6. Goods Receipt #2 (confirmed) — Apple + Sony + LG + accessories
const gr2 = await db.insert(goodsReceipts).values({
  receiptNumber: 'GR-260725-0002',
  supplierName: 'PT Apple Indonesia',
  receiptDate: new Date('2026-07-22'),
  status: 'confirmed',
  notes: 'PO #PO2607-002',
  warehouseId,
}).returning().then(r => r[0]);

await db.insert(goodsReceiptItems).values([
  { receiptId: gr2.id, productId: bySku['HP-IP15-001'].id, quantity: 4, unitPrice: '18400000' },
  { receiptId: gr2.id, productId: bySku['TB-IPAD-001'].id, quantity: 6, unitPrice: '8200000' },
  { receiptId: gr2.id, productId: bySku['AU-AIRP5-001'].id, quantity: 15, unitPrice: '2800000' },
  { receiptId: gr2.id, productId: bySku['TV-LG55-001'].id, quantity: 2, unitPrice: '14500000' },
  { receiptId: gr2.id, productId: bySku['TV-SAM65-001'].id, quantity: 3, unitPrice: '9800000' },
  { receiptId: gr2.id, productId: bySku['KM-SONY-001'].id, quantity: 2, unitPrice: '23500000' },
  { receiptId: gr2.id, productId: bySku['TB-SGT-001'].id, quantity: 5, unitPrice: '6800000' },
]);

for (let i = 0; i < 4; i++)  await db.insert(serialNumbers).values({ productId: bySku['HP-IP15-001'].id,  serialNumber: `IP15-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 6; i++)  await db.insert(serialNumbers).values({ productId: bySku['TB-IPAD-001'].id,  serialNumber: `IPAD-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 15; i++) await db.insert(serialNumbers).values({ productId: bySku['AU-AIRP5-001'].id, serialNumber: `AP2-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 2; i++)  await db.insert(serialNumbers).values({ productId: bySku['TV-LG55-001'].id,  serialNumber: `LG55-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 3; i++)  await db.insert(serialNumbers).values({ productId: bySku['TV-SAM65-001'].id, serialNumber: `SAM65-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 2; i++)  await db.insert(serialNumbers).values({ productId: bySku['KM-SONY-001'].id,  serialNumber: `A7IV-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });
for (let i = 0; i < 5; i++)  await db.insert(serialNumbers).values({ productId: bySku['TB-SGT-001'].id,  serialNumber: `SGT-${String(i+1).padStart(3,'0')}`, condition: 'new', status: 'in_stock', warehouseId });

// 7. Goods Issue #1 — sell some Samsung S24U + AirPods, mark as sold
const staffUser = await db.select().from(users).where(eq(users.email, 'staff@toko.com')).limit(1).then(r => r[0]);

const gi1 = await db.insert(goodsIssues).values({
  issueNumber: 'GI-260725-0001',
  issueDate: new Date('2026-07-23'),
  status: 'confirmed',
  notes: 'Penjualan tunai - Budi',
  warehouseId,
}).returning().then(r => r[0]);

const soldSn24_1 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'S24U-001')).limit(1).then(r => r[0]);
const soldSn24_2 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'S24U-002')).limit(1).then(r => r[0]);
const soldAp_1 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'AP2-001')).limit(1).then(r => r[0]);
const soldAp_2 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'AP2-002')).limit(1).then(r => r[0]);

await db.insert(goodsIssueItems).values([
  { issueId: gi1.id, serialNumberId: soldSn24_1.id, sellPrice: '19500000' },
  { issueId: gi1.id, serialNumberId: soldAp_1.id, sellPrice: '3500000' },
]);

await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date('2026-07-23'), updatedAt: new Date() })
  .where(eq(serialNumbers.id, soldSn24_1.id));
await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date('2026-07-23'), updatedAt: new Date() })
  .where(eq(serialNumbers.id, soldAp_1.id));

// 8. Goods Issue #2 — sell iPhone + MacBook
const gi2 = await db.insert(goodsIssues).values({
  issueNumber: 'GI-260725-0002',
  issueDate: new Date('2026-07-24'),
  status: 'confirmed',
  notes: 'Penjualan - Ani',
  warehouseId,
}).returning().then(r => r[0]);

const soldIp = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'IP15-001')).limit(1).then(r => r[0]);
const soldMba = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'MBA3-001')).limit(1).then(r => r[0]);

await db.insert(goodsIssueItems).values([
  { issueId: gi2.id, serialNumberId: soldIp.id, sellPrice: '22000000' },
  { issueId: gi2.id, serialNumberId: soldMba.id, sellPrice: '18900000' },
]);
await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date('2026-07-24'), updatedAt: new Date() })
  .where(eq(serialNumbers.id, soldIp.id));
await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date('2026-07-24'), updatedAt: new Date() })
  .where(eq(serialNumbers.id, soldMba.id));

// 9. Goods Issue #3 — sell PS5 + accessories (make aksesoris low stock)
const gi3 = await db.insert(goodsIssues).values({
  issueNumber: 'GI-260725-0003',
  issueDate: new Date('2026-07-25'),
  status: 'confirmed',
  notes: 'Penjualan - Dodi',
  warehouseId,
}).returning().then(r => r[0]);

const soldPs5 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'PS5-001')).limit(1).then(r => r[0]);
const soldCc1 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'CC-001')).limit(1).then(r => r[0]);
const soldCc2 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'CC-002')).limit(1).then(r => r[0]);
const soldCc3 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'CC-003')).limit(1).then(r => r[0]);
const soldCc4 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'CC-004')).limit(1).then(r => r[0]);
const soldCc5 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'CC-005')).limit(1).then(r => r[0]);
const soldCc6 = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'CC-006')).limit(1).then(r => r[0]);

await db.insert(goodsIssueItems).values([
  { issueId: gi3.id, serialNumberId: soldPs5.id, sellPrice: '7800000' },
  { issueId: gi3.id, serialNumberId: soldCc1.id, sellPrice: '65000' },
  { issueId: gi3.id, serialNumberId: soldCc2.id, sellPrice: '65000' },
  { issueId: gi3.id, serialNumberId: soldCc3.id, sellPrice: '65000' },
  { issueId: gi3.id, serialNumberId: soldCc4.id, sellPrice: '65000' },
  { issueId: gi3.id, serialNumberId: soldCc5.id, sellPrice: '65000' },
  { issueId: gi3.id, serialNumberId: soldCc6.id, sellPrice: '65000' },
]);

const soldSns = [soldPs5, soldCc1, soldCc2, soldCc3, soldCc4, soldCc5, soldCc6];
for (const sn of soldSns) {
  await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date('2026-07-25'), updatedAt: new Date() })
    .where(eq(serialNumbers.id, sn.id));
}

// Mark S24U-002 as sold too (for RMA later, user bought 2 S24Us in issue #1 but we only recorded one)
await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date('2026-07-23'), updatedAt: new Date() })
  .where(eq(serialNumbers.id, soldSn24_2.id));
await db.insert(goodsIssueItems).values({ issueId: gi1.id, serialNumberId: soldSn24_2.id, sellPrice: '19500000' });

// 10. RMA #1 — S24U-001 customer complaining screen defect (processing)
const rma1 = await db.insert(rmas).values({
  rmaNumber: 'RMA-260725-0001',
  serialNumberId: soldSn24_1.id,
  customerName: 'Budi Setiawan',
  reason: 'Layar bergaris hijau setelah pemakaian 2 hari',
  status: 'processing',
  warehouseId,
}).returning().then(r => r[0]);

await db.update(serialNumbers).set({ status: 'rma', updatedAt: new Date() })
  .where(eq(serialNumbers.id, soldSn24_1.id));

// 11. RMA #2 — AP2-001 completed repaired
const rma2 = await db.insert(rmas).values({
  rmaNumber: 'RMA-260725-0002',
  serialNumberId: soldAp_1.id,
  customerName: 'Budi Setiawan',
  reason: 'Suara kiri tidak keluar',
  status: 'completed_repaired',
  resolution: 'Driver kiri diganti, garansi tetap berjalan',
  warehouseId,
}).returning().then(r => r[0]);

await db.update(serialNumbers).set({ status: 'in_stock', condition: 'refurbished', updatedAt: new Date() })
  .where(eq(serialNumbers.id, soldAp_1.id));

// 12. Good issue #4 — sell another S24U
const gi4 = await db.insert(goodsIssues).values({
  issueNumber: 'GI-260726-0004',
  issueDate: new Date('2026-07-26'),
  status: 'draft',
  notes: 'Penjualan - Eko (pending)',
  warehouseId,
}).returning().then(r => r[0]);

const pendingSn = await db.select().from(serialNumbers).where(eq(serialNumbers.serialNumber, 'S24U-003')).limit(1).then(r => r[0]);
await db.insert(goodsIssueItems).values({ issueId: gi4.id, serialNumberId: pendingSn.id, sellPrice: '19500000' });

// 13. Low-stock Aksesoris: sell 44 more CC units so only 1 left (below threshold 5)
const ccRecords = await db.select().from(serialNumbers)
  .where(and(eq(serialNumbers.productId, bySku['AK-CC-001'].id), eq(serialNumbers.status, 'in_stock')))
  .limit(44);
for (const cc of ccRecords) {
  await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date(), updatedAt: new Date() })
    .where(eq(serialNumbers.id, cc.id));
}

// 14. Tempered Glass low stock: sell 95 so only 4 left
const tgRecords = await db.select().from(serialNumbers)
  .where(and(eq(serialNumbers.productId, bySku['AK-TG-001'].id), eq(serialNumbers.status, 'in_stock')))
  .limit(95);
for (const tg of tgRecords) {
  await db.update(serialNumbers).set({ status: 'sold', soldAt: new Date(), updatedAt: new Date() })
    .where(eq(serialNumbers.id, tg.id));
}

console.log([
  'Seed complete.',
  '',
  'Login:',
  '  admin@toko.com  / admin123  (Admin Gudang)',
  '  staff@toko.com  / staff123  (Staf Gudang)',
  '  owner@toko.com  / owner123  (Kepala Toko)',
  '',
  'Data: 14 produk, 8 kategori, 2 confirmed receipts, 3 confirmed issues,',
  '      2 RMAs (1 processing, 1 completed), 1 draft issue.',
  '      Aksesoris Casing = 1 unit (low stock!), Tempered Glass = 4 unit (low stock!)',
].join('\n'));

process.exit(0);
