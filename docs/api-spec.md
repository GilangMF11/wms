# Spesifikasi API

Base URL: `http://localhost:3000/api/v1`

## Format Response Standar

### Sukses

```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

### Error

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Detail error", "details": [] }
}
```

## Autentikasi

Semua endpoint kecuali `/auth/*` wajib menyertakan header:

```
Authorization: Bearer <access_token>
```

Access token expire: 15 menit. Refresh via `/auth/refresh`.

---

## Auth

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| POST | /auth/login | Public | Login, return access + refresh token |
| POST | /auth/refresh | Public | Refresh access token |
| POST | /auth/logout | Authenticated | Revoke refresh token |

### POST /auth/login

```json
// Request
{ "email": "staff@toko.com", "password": "string" }

// Response 200
{
  "success": true,
  "data": {
    "access_token": "jwt...",
    "refresh_token": "uuid",
    "user": { "id": "uuid", "email": "...", "full_name": "...", "role": "staff" }
  }
}
```

---

## Products

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /products | All | List produk, query: `?page=&limit=&search=&category_id=&brand=` |
| GET | /products/:id | All | Detail produk + ringkasan stok |
| POST | /products | admin | Tambah produk |
| PUT | /products/:id | admin | Update produk |
| DELETE | /products/:id | admin | Soft delete |

### POST /products

```json
{
  "sku": "HP-S24-001",
  "name": "Samsung Galaxy S24",
  "brand": "Samsung",
  "category_id": "uuid",
  "buy_price": 12000000,
  "sell_price": 14500000,
  "is_bundle": false,
  "bundle_items": []
}
```

---

## Serial Numbers

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /serial-numbers | All | List serial number, query: `?serial_number=&product_id=&status=&condition=&warehouse_id=&page=&limit=` |
| GET | /serial-numbers/:id | All | Detail satu serial number + riwayat pergerakan |
| POST | /serial-numbers/bulk | staff, admin | Tambah serial number massal (dari goods receipt) |
| GET | /serial-numbers/:id/warranty | All | Cek status garansi |

### GET /serial-numbers/:id/warranty

```json
{
  "success": true,
  "data": {
    "serial_number": "SN-S24-001",
    "product_name": "Samsung Galaxy S24",
    "sold_at": "2026-01-15T10:00:00Z",
    "warranty_expires_at": "2027-01-15T10:00:00Z",
    "days_remaining": 174,
    "status": "active"
  }
}
```

---

## Goods Receipts (Stok Masuk)

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /goods-receipts | All | List receipt, query: `?page=&limit=&status=&supplier=&date_from=&date_to=` |
| GET | /goods-receipts/:id | All | Detail receipt + items |
| POST | /goods-receipts | staff, admin | Buat receipt baru (draft) |
| PUT | /goods-receipts/:id | staff, admin | Update draft |
| POST | /goods-receipts/:id/confirm | staff, admin | Konfirmasi → stok bertambah, minta input serial number |
| POST | /goods-receipts/:id/cancel | admin | Batalkan receipt yang sudah confirmed |

### POST /goods-receipts

```json
{
  "supplier_name": "PT Distri Elektronik",
  "receipt_date": "2026-07-26T10:00:00Z",
  "notes": "PO #123",
  "items": [
    { "product_id": "uuid", "quantity": 5, "unit_price": 12000000 }
  ]
}
```

### POST /goods-receipts/:id/confirm

```json
{
  "serial_numbers": [
    { "item_id": "uuid", "serial_number": "SN-S24-001", "condition": "new" },
    { "item_id": "uuid", "serial_number": "SN-S24-002", "condition": "new" }
  ]
}
```

---

## Goods Issues (Stok Keluar)

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /goods-issues | All | List issue |
| GET | /goods-issues/:id | All | Detail issue + items |
| POST | /goods-issues | staff, admin | Buat issue (draft) |
| PUT | /goods-issues/:id | staff, admin | Update draft |
| POST | /goods-issues/:id/confirm | staff, admin | Konfirmasi → stok berkurang, tanggal jual tercatat |
| POST | /goods-issues/:id/cancel | admin | Batalkan |

### POST /goods-issues

```json
{
  "issue_date": "2026-07-26T14:00:00Z",
  "notes": "Penjualan tunai",
  "items": [
    { "serial_number_id": "uuid", "sell_price": 14500000 }
  ]
}
```

---

## RMA (Retur Pelanggan)

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /rmas | All | List RMA, query: `?status=&customer_name=&date_from=&date_to=` |
| GET | /rmas/:id | All | Detail RMA |
| POST | /rmas | staff, admin | Buat RMA |
| PUT | /rmas/:id/status | staff, admin | Update status + resolution |

### POST /rmas

```json
{
  "serial_number_id": "uuid",
  "customer_name": "Budi Santoso",
  "reason": "Layar bergaris setelah pemakaian 3 bulan"
}
```

### PUT /rmas/:id/status

```json
{
  "status": "completed_repaired",
  "resolution": "LCD diganti, garansi tetap berjalan"
}
```

---

## Supplier Returns

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /supplier-returns | All | List retur supplier |
| POST | /supplier-returns | staff, admin | Buat retur ke supplier |
| PUT | /supplier-returns/:id | admin | Update status |

---

## Stock Opname

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /stock-opnames | All | List sesi opname |
| GET | /stock-opnames/:id | All | Detail opname + items |
| POST | /stock-opnames | staff, admin | Buat sesi opname (draft) |
| PUT | /stock-opnames/:id/items | staff, admin | Submit hasil hitung fisik |
| POST | /stock-opnames/:id/submit | staff, admin | Kirim ke review |
| POST | /stock-opnames/:id/approve | admin | Approve → buat stock_adjustments otomatis |

### PUT /stock-opnames/:id/items

```json
{
  "items": [
    { "product_id": "uuid", "physical_quantity": 48 }
  ]
}
```

---

## Dashboard & Reports

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /dashboard/summary | All | Ringkasan stok, nilai inventori |
| GET | /dashboard/low-stock | All | Produk dengan stok di bawah threshold |
| GET | /reports/warranty | All | Laporan garansi aktif & kedaluwarsa |
| GET | /reports/rma | All | Riwayat & ringkasan RMA |
| GET | /reports/stock-movement | All | Mutasi stok dalam rentang tanggal |

### GET /dashboard/summary

```json
{
  "success": true,
  "data": {
    "total_products": 150,
    "total_units_in_stock": 2340,
    "inventory_value": 32450000000,
    "by_category": [
      { "category": "Smartphone", "units": 500, "value": 25000000000 }
    ],
    "low_stock_count": 12
  }
}
```

---

## Users (Admin only)

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /users | admin | List user |
| POST | /users | admin | Tambah user |
| PUT | /users/:id | admin | Update user |
| POST | /users/:id/deactivate | admin | Nonaktifkan user |

### POST /users

```json
{
  "email": "staff2@toko.com",
  "password": "securepass123",
  "full_name": "Andi Staf",
  "role": "staff",
  "warehouse_id": "uuid"
}
```

---

## Audit Log (Admin & Owner only)

| Method | Path | Role | Deskripsi |
|---|---|---|---|
| GET | /audit-logs | admin, owner | List log, query: `?user_id=&entity_type=&action=&date_from=&date_to=&page=` |
