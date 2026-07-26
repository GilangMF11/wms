# Skema Database

## Konvensi

- Semua tabel wajib: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`, `deleted_at TIMESTAMPTZ`.
- Semua nama tabel & kolom: `snake_case`.
- Timestamps: `TIMESTAMPTZ`.
- Uang/harga: `NUMERIC(15,2)`.
- Audit trail via tabel `audit_log`, bukan trigger.

---

## 1. `warehouses`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(255) | NOT NULL |
| code | VARCHAR(50) | UNIQUE NOT NULL |
| address | TEXT | |
| is_active | BOOLEAN | DEFAULT true |

---

## 2. `users`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, CHECK (role IN ('admin', 'staff', 'owner')) |
| warehouse_id | UUID | FK → warehouses.id, NULLABLE (owner bisa lihat semua) |
| is_active | BOOLEAN | DEFAULT true |

---

## 3. `categories`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(255) | UNIQUE NOT NULL |
| warranty_duration_days | INTEGER | NOT NULL DEFAULT 365 |
| warehouse_id | UUID | FK → warehouses.id, NULLABLE |

---

## 4. `products`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| sku | VARCHAR(100) | UNIQUE NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| brand | VARCHAR(255) | |
| category_id | UUID | FK → categories.id |
| buy_price | NUMERIC(15,2) | |
| sell_price | NUMERIC(15,2) | |
| image_url | TEXT | |
| is_bundle | BOOLEAN | DEFAULT false |
| warehouse_id | UUID | FK → warehouses.id |

---

## 5. `bundle_items`

> Hanya berlaku untuk produk `is_bundle = true`.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| bundle_product_id | UUID | FK → products.id, NOT NULL |
| component_product_id | UUID | FK → products.id, NOT NULL |
| quantity | INTEGER | NOT NULL DEFAULT 1 |
| UNIQUE(bundle_product_id, component_product_id) | | |

---

## 6. `serial_numbers`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK → products.id, NOT NULL |
| serial_number | VARCHAR(255) | UNIQUE NOT NULL |
| condition | VARCHAR(20) | NOT NULL DEFAULT 'new', CHECK IN ('new','refurbished','display','damaged') |
| status | VARCHAR(20) | NOT NULL DEFAULT 'in_stock', CHECK IN ('in_stock','sold','returned','rma') |
| sold_at | TIMESTAMPTZ | diisi saat status menjadi 'sold' |
| warehouse_id | UUID | FK → warehouses.id, NOT NULL |

---

## 7. `goods_receipts`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| receipt_number | VARCHAR(100) | UNIQUE NOT NULL |
| supplier_name | VARCHAR(255) | NOT NULL |
| receipt_date | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| status | VARCHAR(20) | NOT NULL DEFAULT 'draft', CHECK IN ('draft','confirmed','cancelled') |
| notes | TEXT | |
| created_by | UUID | FK → users.id |
| warehouse_id | UUID | FK → warehouses.id, NOT NULL |

---

## 8. `goods_receipt_items`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| receipt_id | UUID | FK → goods_receipts.id, NOT NULL |
| product_id | UUID | FK → products.id, NOT NULL |
| quantity | INTEGER | NOT NULL |
| unit_price | NUMERIC(15,2) | NOT NULL |

---

## 9. `goods_issues`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| issue_number | VARCHAR(100) | UNIQUE NOT NULL |
| issue_date | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| status | VARCHAR(20) | NOT NULL DEFAULT 'draft', CHECK IN ('draft','confirmed','cancelled') |
| notes | TEXT | |
| created_by | UUID | FK → users.id |
| warehouse_id | UUID | FK → warehouses.id, NOT NULL |

---

## 10. `goods_issue_items`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| issue_id | UUID | FK → goods_issues.id, NOT NULL |
| serial_number_id | UUID | FK → serial_numbers.id, NOT NULL |
| sell_price | NUMERIC(15,2) | |

---

## 11. `rmas` (Retur Pelanggan)

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| rma_number | VARCHAR(100) | UNIQUE NOT NULL |
| serial_number_id | UUID | FK → serial_numbers.id, NOT NULL |
| customer_name | VARCHAR(255) | NOT NULL |
| reason | TEXT | NOT NULL |
| status | VARCHAR(20) | NOT NULL DEFAULT 'received', CHECK IN ('received','processing','completed_replaced','completed_repaired','rejected') |
| resolution | TEXT | |
| created_by | UUID | FK → users.id |
| warehouse_id | UUID | FK → warehouses.id, NOT NULL |

---

## 12. `supplier_returns`

> Retur barang ke supplier (cacat pabrik), terpisah dari RMA pelanggan.

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| return_number | VARCHAR(100) | UNIQUE NOT NULL |
| serial_number_id | UUID | FK → serial_numbers.id, NOT NULL |
| supplier_name | VARCHAR(255) | NOT NULL |
| reason | TEXT | NOT NULL |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending', CHECK IN ('pending','shipped','completed','rejected') |
| created_by | UUID | FK → users.id |
| warehouse_id | UUID | FK → warehouses.id, NOT NULL |

---

## 13. `stock_opnames`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| opname_number | VARCHAR(100) | UNIQUE NOT NULL |
| opname_date | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| status | VARCHAR(20) | NOT NULL DEFAULT 'draft', CHECK IN ('draft','review','approved') |
| approved_by | UUID | FK → users.id, NULLABLE |
| warehouse_id | UUID | FK → warehouses.id, NOT NULL |

---

## 14. `stock_opname_items`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| opname_id | UUID | FK → stock_opnames.id, NOT NULL |
| product_id | UUID | FK → products.id, NOT NULL |
| system_quantity | INTEGER | NOT NULL |
| physical_quantity | INTEGER | NOT NULL |
| difference | INTEGER | GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED |

---

## 15. `stock_adjustments` (Log Penyesuaian Selisih)

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| serial_number_id | UUID | FK → serial_numbers.id, NOT NULL |
| adjustment_type | VARCHAR(20) | NOT NULL, CHECK IN ('IN','OUT') |
| quantity | INTEGER | NOT NULL (selalu 1 per serial number) |
| reason | TEXT | NOT NULL |
| opname_id | UUID | FK → stock_opnames.id, NULLABLE |
| created_by | UUID | FK → users.id |
| warehouse_id | UUID | FK → warehouses.id, NOT NULL |

---

## 16. `audit_log`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| action | VARCHAR(100) | NOT NULL, contoh: 'goods_receipt.create', 'stock_opname.approve' |
| entity_type | VARCHAR(50) | NOT NULL, contoh: 'goods_receipt', 'serial_number' |
| entity_id | UUID | NOT NULL |
| old_values | JSONB | snapshot sebelum perubahan |
| new_values | JSONB | snapshot setelah perubahan |
| ip_address | INET | |

---

## 17. `refresh_tokens`

| Kolom | Tipe | Constraint |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| token_hash | VARCHAR(255) | UNIQUE NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

---

## Index Tambahan

```sql
CREATE INDEX idx_serial_numbers_product ON serial_numbers(product_id);
CREATE INDEX idx_serial_numbers_warehouse ON serial_numbers(warehouse_id);
CREATE INDEX idx_serial_numbers_status ON serial_numbers(status);
CREATE INDEX idx_goods_receipts_date ON goods_receipts(receipt_date);
CREATE INDEX idx_goods_issues_date ON goods_issues(issue_date);
CREATE INDEX idx_rmas_status ON rmas(status);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```
