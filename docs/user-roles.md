# Peran Pengguna & Hak Akses

## Matriks Akses

| Modul | Admin Gudang | Staf Gudang | Kepala Toko / Owner |
|---|---|---|---|
| **Master Data Produk** | CRUD penuh | Lihat | Lihat |
| **Serial Number** | Lihat, bulk insert | Lihat, bulk insert (dari receipt) | Lihat |
| **Stok Masuk** | Kelola penuh + confirm + cancel | Input + confirm | Lihat |
| **Stok Keluar** | Kelola penuh + confirm + cancel | Input + confirm | Lihat |
| **RMA / Retur Pelanggan** | Kelola penuh + update status | Input | Lihat |
| **Retur Supplier** | Kelola penuh | Input | Lihat |
| **Stock Opname** | Approve + lihat penuh | Input + submit | Lihat |
| **Dashboard** | Lihat penuh | Lihat terbatas (warehouse sendiri) | Lihat penuh |
| **Laporan** | Lihat penuh | Lihat terbatas | Lihat penuh |
| **Manajemen User** | Kelola penuh | Tidak ada akses | Tidak ada akses |
| **Audit Log** | Lihat penuh | Tidak ada akses | Lihat penuh |

## Definisi Role

### Admin Gudang (`admin`)
- Akses tertinggi. Mengelola master data, user, approval transaksi.
- Hanya admin yang bisa: cancel receipt yang sudah confirmed, cancel issue yang sudah confirmed, approve opname, kelola user.

### Staf Gudang (`staff`)
- Operator harian. Input stok masuk, stok keluar, RMA, opname.
- Tidak bisa cancel transaksi yang sudah confirmed (harus minta admin).
- Tidak bisa update status RMA ke completed/rejected (admin yang memutuskan).

### Kepala Toko / Owner (`owner`)
- Pemantau (read-only). Melihat dashboard, laporan, audit log.
- Tidak bisa melakukan input transaksi apapun.
- Tujuan: pengambilan keputusan berdasarkan data.

## Implementasi RBAC

### Middleware Backend

```typescript
// apps/api/src/middleware/rbac.ts
import { createMiddleware } from 'hono/factory'

type Role = 'admin' | 'staff' | 'owner'

export function requireRole(...roles: Role[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get('user') // dari auth middleware
    if (!roles.includes(user.role)) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, 403)
    }
    await next()
  })
}
```

### Penggunaan di Route Handler

```typescript
// Contoh: goods_receipts.route.ts
router.get('/', requireRole('admin', 'staff', 'owner'), listReceipts)
router.post('/', requireRole('admin', 'staff'), createReceipt)
router.post('/:id/confirm', requireRole('admin', 'staff'), confirmReceipt)
router.post('/:id/cancel', requireRole('admin'), cancelReceipt)
```

### Guard di Frontend

- **Router guard**: `beforeEach` redirect ke `/unauthorized` jika role tidak sesuai meta.
- **Komponen conditional**: `v-if="authStore.user?.role === 'admin'"` untuk menyembunyikan tombol/menu yang tidak berhak.
- **Sidebar menu**: filter item menu berdasarkan role. Item "Pengguna" dan "Audit Log" hanya untuk admin. Item "Dashboard" dan "Laporan" tampil di semua role.

```typescript
// Route meta
{ path: '/users', component: UsersPage, meta: { roles: ['admin'] } }
{ path: '/rma', component: RMAPage, meta: { roles: ['admin', 'staff', 'owner'] } }
```

## Audit Trail

### Kapan audit dicatat

Setiap aksi berikut wajib menghasilkan 1 row `audit_log`:

| Aksi | entity_type | action |
|---|---|---|
| Login berhasil | `user` | `auth.login` |
| Create produk | `product` | `product.create` |
| Update produk | `product` | `product.update` |
| Delete produk (soft) | `product` | `product.delete` |
| Create goods receipt | `goods_receipt` | `goods_receipt.create` |
| Confirm goods receipt | `goods_receipt` | `goods_receipt.confirm` |
| Cancel goods receipt | `goods_receipt` | `goods_receipt.cancel` |
| Create goods issue | `goods_issue` | `goods_issue.create` |
| Confirm goods issue | `goods_issue` | `goods_issue.confirm` |
| Cancel goods issue | `goods_issue` | `goods_issue.cancel` |
| Create RMA | `rma` | `rma.create` |
| Update RMA status | `rma` | `rma.status_update` |
| Create retur supplier | `supplier_return` | `supplier_return.create` |
| Create stock opname | `stock_opname` | `stock_opname.create` |
| Submit stock opname | `stock_opname` | `stock_opname.submit` |
| Approve stock opname | `stock_opname` | `stock_opname.approve` |
| Create user | `user` | `user.create` |
| Update user | `user` | `user.update` |
| Deactivate user | `user` | `user.deactivate` |

### Cara Pencatatan

- Backend service mencatat audit **setelah** operasi berhasil (tidak dalam transaksi yang sama agar audit tetap tertulis meskipun transaksi bisnis rollback).
- `old_values` diisi hanya untuk UPDATE.
- `new_values` diisi untuk CREATE dan UPDATE.
- `ip_address` diambil dari request header `x-forwarded-for` atau `c.req.header()`.
- User ID berasal dari token JWT yang sudah di-extract oleh auth middleware.

### Log tidak bisa dihapus

- Tidak ada endpoint `DELETE /audit-logs`.
- Tidak ada operasi UPDATE atau DELETE di tabel `audit_log` oleh aplikasi.
