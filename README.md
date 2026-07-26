# WMS — Warehouse Management System

Sistem manajemen gudang untuk toko retail elektronik. Melacak stok per serial number, garansi, RMA, dan stock opname.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vue 3 + Vite + Tailwind CSS + PrimeVue 4 |
| Backend | Bun + Hono (REST API) |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM |
| Auth | JWT + bcrypt |
| Validation | Zod (shared monorepo) |
| Scanner | html5-qrcode (browser camera) |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (pick one)
docker compose up -d                          # Docker
# or use existing PostgreSQL instance

# 3. Configure .env
cp .env.example .env                          # edit DATABASE_URL + JWT secrets

# 4. Run migrations
npm run db:migrate

# 5. Seed sample data
npm run db:seed

# 6. Start dev servers
npm run dev                                   # API :3000 + Web :5173
```

## Login

| Role | Email | Password |
|---|---|---|
| Admin Gudang | `admin@toko.com` | `admin123` |
| Staf Gudang | `staff@toko.com` | `staff123` |
| Kepala Toko | `owner@toko.com` | `owner123` |

## Project Structure

```
wms/
├── apps/
│   ├── api/                  # Backend (Bun + Hono)
│   │   └── src/
│   │       ├── routes/       # auth, products, serial-numbers,
│   │       │                 # goods-receipts, goods-issues,
│   │       │                 # rmas, stock-opnames, supplier-returns,
│   │       │                 # dashboard, users, audit-logs
│   │       ├── middleware/   # auth, RBAC, Zod validation
│   │       ├── db/           # Drizzle schema (17 tables) + seed
│   │       └── utils/        # JWT, audit helper, number generator
│   └── web/                  # Frontend (Vue 3 + Vite + Tailwind)
│       └── src/
│           ├── layouts/      # AuthLayout, DashboardLayout
│           ├── pages/        # 11 page components
│           ├── components/   # BarcodeScanner, shared UI
│           ├── composables/  # useApi, useConfirm
│           ├── stores/       # Pinia auth store
│           └── lib/          # axios, router
├── packages/
│   └── shared/               # Zod schemas (shared API ↔ Web)
└── docs/                     # Spec documents
    ├── architecture.md
    ├── database.md
    ├── api-spec.md
    ├── features.md
    ├── design.md
    └── user-roles.md
```

## Features

- **Master Data** — Produk, kategori, bundle, kondisi/grade
- **Serial Number** — Satu SN per unit, pelacakan pergerakan
- **Stok Masuk** — Goods receipt + input serial number + konfirmasi
- **Stok Keluar** — Goods issue + scan/auto-complete SN + konfirmasi
- **Garansi** — Hitung otomatis dari `tanggal jual + durasi per kategori`
- **RMA** — Retur pelanggan, stepper status, resolusi
- **Supplier Return** — Retur cacat pabrik terpisah dari RMA
- **Stock Opname** — Hitung fisik vs system, approve → auto adjustment
- **Dashboard** — Inventory value, stok per kategori, low stock alert + badge
- **Barcode Scanner** — Scan via kamera browser (HTTPS required)
- **Audit Trail** — Log semua mutasi (soft-delete guarded, tidak bisa dihapus)
- **RBAC** — Admin / Staff / Owner, enforced di middleware + router guard
- **Responsive** — Mobile-first, sidebar drawer, tabel horizontal scroll

## Scripts

```bash
npm run dev           # Start both API + Web concurrently
npm run dev:api       # API only (bun --watch, port 3000)
npm run dev:web       # Web only (vite --https, port 5173)

npm run db:generate   # Generate Drizzle migration
npm run db:migrate    # Run migrations
npm run db:seed       # Seed sample data
npm run db:studio     # Drizzle Studio (DB GUI)

npm run build         # Build API + Web for production
npm run lint          # Biome check
npm run typecheck     # TypeScript check
```

## API

Base URL: `http://localhost:3000/api/v1`

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `/refresh`, `/logout` |
| Users | `GET/POST/PUT /users`, `POST /users/:id/deactivate` |
| Products | `GET/POST/PUT/DELETE /products`, `/categories` |
| Serial Numbers | `GET /serial-numbers`, `/:id`, `/bulk`, `/:id/warranty` |
| Goods Receipts | `GET/POST/PUT /goods-receipts`, `/:id/confirm`, `/:id/cancel` |
| Goods Issues | `GET/POST/PUT /goods-issues`, `/:id/confirm`, `/:id/cancel` |
| RMAs | `GET/POST /rmas`, `PUT /rmas/:id/status` |
| Supplier Returns | `GET/POST /supplier-returns`, `PUT /:id` |
| Stock Opnames | `GET/POST /stock-opnames`, `/:id/items`, `/submit`, `/approve` |
| Dashboard | `GET /dashboard/summary`, `/low-stock` |
| Reports | `GET /reports/warranty`, `/rma`, `/stock-movement` |
| Audit Logs | `GET /audit-logs` (admin, owner) |

## Database

17 tabel PostgreSQL — schema di `apps/api/src/db/schema/index.ts`. Semua tabel transaksional pakai `warehouse_id` untuk siap multi-cabang (Fase 2). Detail: [docs/database.md](docs/database.md).

## Barcode Scanning

Scanner menggunakan `html5-qrcode` via kamera browser. **Harus HTTPS** (dev server sudah di-set HTTPS via `@vitejs/plugin-basic-ssl`). Pertama kali buka, browser akan minta izin kamera. Ada tombol ganti kamera (depan ↔ belakang) di dialog scanner.

## Environment Variables

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/db_wms
JWT_SECRET=random-64-char-string
JWT_REFRESH_SECRET=random-64-char-string
PORT=3000
```
