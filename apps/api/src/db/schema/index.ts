import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  jsonb,
  inet,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  address: text('address'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).unique().notNull(),
  warrantyDurationDays: integer('warranty_duration_days').notNull().default(365),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: varchar('sku', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 255 }),
  categoryId: uuid('category_id').references(() => categories.id),
  buyPrice: numeric('buy_price', { precision: 15, scale: 2 }),
  sellPrice: numeric('sell_price', { precision: 15, scale: 2 }),
  imageUrl: text('image_url'),
  isBundle: boolean('is_bundle').default(false),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const bundleItems = pgTable(
  'bundle_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bundleProductId: uuid('bundle_product_id')
      .references(() => products.id)
      .notNull(),
    componentProductId: uuid('component_product_id')
      .references(() => products.id)
      .notNull(),
    quantity: integer('quantity').notNull().default(1),
  },
  (t) => [uniqueIndex('bundle_unique_idx').on(t.bundleProductId, t.componentProductId)],
);

export const serialNumbers = pgTable(
  'serial_numbers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    serialNumber: varchar('serial_number', { length: 255 }).unique().notNull(),
    condition: varchar('condition', { length: 20 }).notNull().default('new'),
    status: varchar('status', { length: 20 }).notNull().default('in_stock'),
    soldAt: timestamp('sold_at', { withTimezone: true }),
    warehouseId: uuid('warehouse_id')
      .references(() => warehouses.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('sn_product_idx').on(t.productId),
    index('sn_warehouse_idx').on(t.warehouseId),
    index('sn_status_idx').on(t.status),
  ],
);

export const goodsReceipts = pgTable(
  'goods_receipts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    receiptNumber: varchar('receipt_number', { length: 100 }).unique().notNull(),
    supplierName: varchar('supplier_name', { length: 255 }).notNull(),
    receiptDate: timestamp('receipt_date', { withTimezone: true }).notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    warehouseId: uuid('warehouse_id')
      .references(() => warehouses.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('gr_date_idx').on(t.receiptDate)],
);

export const goodsReceiptItems = pgTable('goods_receipt_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  receiptId: uuid('receipt_id')
    .references(() => goodsReceipts.id)
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
});

export const goodsIssues = pgTable(
  'goods_issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    issueNumber: varchar('issue_number', { length: 100 }).unique().notNull(),
    issueDate: timestamp('issue_date', { withTimezone: true }).notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    warehouseId: uuid('warehouse_id')
      .references(() => warehouses.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('gi_date_idx').on(t.issueDate)],
);

export const goodsIssueItems = pgTable('goods_issue_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  issueId: uuid('issue_id')
    .references(() => goodsIssues.id)
    .notNull(),
  serialNumberId: uuid('serial_number_id')
    .references(() => serialNumbers.id)
    .notNull(),
  sellPrice: numeric('sell_price', { precision: 15, scale: 2 }),
});

export const rmas = pgTable(
  'rmas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rmaNumber: varchar('rma_number', { length: 100 }).unique().notNull(),
    serialNumberId: uuid('serial_number_id')
      .references(() => serialNumbers.id)
      .notNull(),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('received'),
    resolution: text('resolution'),
    createdBy: uuid('created_by').references(() => users.id),
    warehouseId: uuid('warehouse_id')
      .references(() => warehouses.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('rma_status_idx').on(t.status)],
);

export const supplierReturns = pgTable('supplier_returns', {
  id: uuid('id').primaryKey().defaultRandom(),
  returnNumber: varchar('return_number', { length: 100 }).unique().notNull(),
  serialNumberId: uuid('serial_number_id')
    .references(() => serialNumbers.id)
    .notNull(),
  supplierName: varchar('supplier_name', { length: 255 }).notNull(),
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdBy: uuid('created_by').references(() => users.id),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const stockOpnames = pgTable('stock_opnames', {
  id: uuid('id').primaryKey().defaultRandom(),
  opnameNumber: varchar('opname_number', { length: 100 }).unique().notNull(),
  opnameDate: timestamp('opname_date', { withTimezone: true }).notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  approvedBy: uuid('approved_by').references(() => users.id),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const stockOpnameItems = pgTable('stock_opname_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  opnameId: uuid('opname_id')
    .references(() => stockOpnames.id)
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  systemQuantity: integer('system_quantity').notNull(),
  physicalQuantity: integer('physical_quantity').notNull(),
  difference: integer('difference').notNull(),
});

export const stockAdjustments = pgTable('stock_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  serialNumberId: uuid('serial_number_id')
    .references(() => serialNumbers.id)
    .notNull(),
  adjustmentType: varchar('adjustment_type', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  reason: text('reason').notNull(),
  opnameId: uuid('opname_id').references(() => stockOpnames.id),
  createdBy: uuid('created_by').references(() => users.id),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('audit_user_idx').on(t.userId),
    index('audit_entity_idx').on(t.entityType, t.entityId),
  ],
);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
