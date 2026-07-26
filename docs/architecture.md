# Arsitektur Sistem

## Stack Teknologi

| Komponen | Pilihan | Versi Target |
|---|---|---|
| Frontend Web | Vue 3 (Composition API) + Vite | Vue ^3.4, Vite ^5 |
| State Management | Pinia | ^2 |
| Router | Vue Router | ^4 |
| UI Framework | PrimeVue (tailwind-based) | ^4 |
| HTTP Client | Axios | ^1 |
| Mobile (Staf Gudang) | Flutter (bahasa Dart) | ^3.24 |
| Backend/API | Bun + Hono (Node.js-compatible) | Bun ^1.1, Hono ^4 |
| ORM | Drizzle ORM | ^0.36 |
| Database | PostgreSQL | ^16 |
| Autentikasi | JWT + bcrypt | jsonwebtoken ^9 |
| Validasi | Zod (shared DTO frontend+backend) | ^3 |
| Deployment | Docker Compose (dev), VPS (production) | - |

## Struktur Monorepo

```
wms/
├── apps/
│   ├── api/                    # Backend Bun + Hono
│   │   ├── src/
│   │   │   ├── routes/         # Hono route handlers per modul
│   │   │   ├── middleware/     # Auth, RBAC, validation
│   │   │   ├── db/            # Drizzle schema + migration
│   │   │   ├── services/      # Business logic
│   │   │   └── utils/         # JWT, hash, helpers
│   │   ├── drizzle/           # Auto-generated migrations
│   │   └── package.json
│   └── web/                    # Frontend Vue 3 + Vite
│       ├── src/
│       │   ├── layouts/       # AuthLayout, DashboardLayout
│       │   ├── pages/         # Route-level page components
│       │   ├── components/    # Shared UI components
│       │   ├── composables/   # Shared reactive logic
│       │   ├── stores/        # Pinia stores
│       │   ├── lib/           # Axios instance, utils
│       │   └── types/         # Zod infer types
│       └── package.json
├── packages/
│   └── shared/                 # Zod schemas, DTO types
│       └── src/
│           ├── schemas/        # product.schema.ts, stock.schema.ts, dll
│           └── types/          # TypeScript type exports
├── docker-compose.yml
└── README.md
```

## Pola Arsitektur

### Backend: Layered API

```
Request → Middleware (Auth, RBAC) → Route Handler → Service → Drizzle ORM → PostgreSQL
```

- **Route Handler**: parsing request, response formatting. Tidak ada business logic.
- **Service**: semua business logic. Route handler hanya memanggil service.
- **Middleware chain**: `authMiddleware → rbacMiddleware(role[]) → zodValidation(schema)`

### Frontend: Page → Store → API

```
Page Component → Pinia Store (state + actions) → Axios Client → REST API
```

- **Page Component**: rendering + event handling. Tidak ada API call langsung.
- **Pinia Store**: state, actions (API calls), getters (derived state).
- **Pages** tidak boleh import Axios secara langsung. Selalu lewat store action.

## Konvensi Penamaan

| Elemen | Konvensi | Contoh |
|---|---|---|
| File komponen Vue | PascalCase | `ProductTable.vue` |
| File composable | camelCase, prefix `use` | `useAuth.ts` |
| File Pinia store | camelCase, prefix `use` | `useProductStore.ts` |
| File route handler | kebab-case | `products.ts` |
| File service | kebab-case | `product.service.ts` |
| File middleware | kebab-case | `rbac.ts` |
| Kolom database | snake_case | `created_at`, `serial_number` |

## Prinsip Desain

1. **Single-tenant schema, multi-warehouse ready**. Setiap tabel inti miliki `warehouse_id`. Satu database, satu tenant (toko). Cabang = warehouse record. Simpel, siap ekspansi tanpa migrasi ulang.
2. **Shared Zod schemas**. Validasi request di backend, validasi form di frontend — pakai schema yang sama dari `packages/shared`.
3. **Soft delete only**. Tidak ada `DELETE` fisik untuk data master & transaksional. Gunakan `deleted_at TIMESTAMP`.
4. **Audit log server-side**. Backend inject `user_id` + `timestamp` otomatis via middleware. Frontend tidak kirim field audit.
