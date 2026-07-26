# Spesifikasi Fitur

## F-01: Master Data Produk

**Prioritas**: Wajib  
**Role**: Admin (kelola), Staff & Owner (lihat)

### Fields
Nama, SKU, brand, kategori, harga beli, harga jual, foto, is_bundle.

### Acceptance Criteria
- Admin dapat CRUD produk.
- SKU unique, validasi di backend.
- Foto upload maks 2MB, format jpg/png/webp.
- Produk bundle dapat menambahkan komponen dari produk yang sudah ada.
- Produk yang sudah memiliki serial number tidak bisa dihapus (soft delete only).

---

## F-02: Serial Number per Unit

**Prioritas**: Wajib  
**Role**: Admin & Staff (input), Owner (lihat)

### Acceptance Criteria
- Setiap unit produk memiliki satu serial number unique.
- Input serial number terjadi saat konfirmasi goods receipt (F-06).
- Serial number tidak bisa diedit setelah confirmed.
- Status serial berubah otomatis: `in_stock` → `sold` (goods issue) → `returned` (RMA).
- Pencarian serial number via search bar di semua halaman stok.

---

## F-03: Bundle Produk

**Prioritas**: Sebaiknya  
**Role**: Admin

### Acceptance Criteria
- Produk dengan `is_bundle = true` bisa memiliki 1..N komponen dari produk existing.
- Harga bundle bisa di-set manual (bukan jumlah komponen).
- Stok bundle tidak dihitung terpisah — hanya komponen yang punya fisik.
- Tidak ada serial number di level bundle.

---

## F-04: Kondisi / Grading Produk

**Prioritas**: Sebaiknya  
**Role**: Admin & Staff

### Acceptance Criteria
- Setiap serial number memiliki field `condition`: `new`, `refurbished`, `display`, `damaged`.
- Kondisi terlihat di detail serial number dan dashboard stok.
- Filter stok berdasarkan kondisi tersedia.

---

## F-05 s/d F-07: Stok Masuk (Goods Receipt)

**Prioritas**: Wajib  
**Role**: Staff (input), Admin (kelola)

### Acceptance Criteria
- Staff membuat goods receipt dengan: supplier, tanggal, catatan, item produk + quantity + harga beli.
- Status awal: `draft`. Bisa diedit.
- Saat konfirmasi (`POST /confirm`), system menampilkan form input serial number sesuai quantity per item.
- Serial number unique (backend validasi duplicate).
- Stok serial number otomatis terbuat dengan status `in_stock`.
- Receipt yang sudah `confirmed` tidak bisa diedit, hanya bisa `cancel` oleh admin.

---

## F-08 s/d F-10: Stok Keluar (Goods Issue)

**Prioritas**: Wajib  
**Role**: Staff (input), Admin (kelola)

### Acceptance Criteria
- Staff membuat goods issue: tanggal, catatan, item serial number + harga jual.
- System hanya menampilkan serial number dengan status `in_stock` di warehouse bersangkutan.
- Saat konfirmasi, status serial berubah: `in_stock` → `sold`, field `sold_at` terisi.
- `sold_at` menjadi acuan awal masa garansi.
- Issue yang sudah `confirmed` tidak bisa diedit, hanya bisa `cancel` oleh admin (serial kembali `in_stock`, `sold_at` null).

---

## F-11 s/d F-13: Manajemen Garansi

**Prioritas**: Wajib  
**Role**: Semua (lihat)

### Acceptance Criteria
- Masa garansi = `sold_at + categories.warranty_duration_days`.
- Admin bisa atur durasi garansi berbeda per kategori (default 365 hari).
- Halaman cek garansi: input serial number → tampilkan status, tanggal beli, tanggal kedaluwarsa, sisa hari.
- Produk belum terjual → garansi belum berlaku.
- Produk kedaluwarsa → status `expired`.

---

## F-14 s/d F-16: RMA & Retur

**Prioritas**: Wajib  
**Role**: Staff (input), Admin (kelola)

### Acceptance Criteria
- Staff membuat RMA: serial number, nama customer, alasan.
- Serial number harus berstatus `sold`.
- Status RMA flow: `received` → `processing` → `completed_replaced` / `completed_repaired` / `rejected`.
- RMA `completed_replaced` atau `completed_repaired`: serial number kembali ke `in_stock` dengan kondisi diperbarui.
- RMA `rejected`: serial number tetap `sold` (tidak berubah).
- Supplier return (F-16): terpisah dari RMA pelanggan, digunakan untuk retur barang cacat pabrik. Flow: `pending` → `shipped` → `completed` / `rejected`.

---

## F-17 s/d F-18: Stock Opname

**Prioritas**: Wajib  
**Role**: Staff (input), Admin (approve)

### Acceptance Criteria
- Staff membuat sesi opname (draft).
- Staff mensubmit hasil hitung fisik per produk.
- System menghitung selisih otomatis: `physical - system`.
- Saat admin approve, system membuat `stock_adjustments` otomatis untuk setiap selisih.
- Satu adjustment row = satu serial number (ditambahkan atau dikurangi).

---

## F-19 s/d F-21: Dashboard & Laporan

**Prioritas**: Wajib  
**Role**: Semua (sesuai role)

### Acceptance Criteria
- Dashboard menampilkan: total produk, total unit stok, nilai inventori, breakdown per kategori, jumlah produk low stock.
- Low stock alert: produk yang stok unitnya ≤ 5 (threshold bisa dikonfigurasi).
- Notifikasi low stock muncul di dashboard + badge di sidebar.
- Laporan garansi: tabel serial number dengan garansi aktif, filter sisa hari.
- Laporan RMA: ringkasan jumlah RMA per status, detail per RMA.

---

## F-22 s/d F-23: Manajemen Pengguna & Audit Trail

**Prioritas**: Wajib  
**Role**: Admin

### Acceptance Criteria
- Login: email + password → JWT access (15 menit) + refresh token (7 hari).
- 3 role: `admin`, `staff`, `owner`. RBAC diterapkan di middleware.
- Admin bisa CRUD user.
- User tidak bisa menghapus akun sendiri.
- Audit trail tercatat otomatis oleh backend untuk setiap: create/update/confirm/cancel/approve di semua modul transaksional.
- Audit log tidak bisa dihapus atau diedit oleh siapapun.
- Owner melihat audit log (read-only).
