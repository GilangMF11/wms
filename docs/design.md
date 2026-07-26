# Desain UI/UX

## Design System

### Color Tokens

```
Primary:    #2563EB (blue-600)
Secondary:  #64748B (slate-500)
Success:    #16A34A (green-600)
Warning:    #D97706 (amber-600)
Danger:     #DC2626 (red-600)
Info:       #0EA5E9 (sky-500)

Surface:    #FFFFFF (card, modal)
Background: #F8FAFC (slate-50, page bg)
Border:     #E2E8F0 (slate-200)
Text:       #1E293B (slate-800)
Muted:      #64748B (slate-500)
```

### Typography

- Font: **Inter** (sans-serif)
- Heading: `font-semibold`
- Body: `font-normal`
- Monospace (kode/serial number): `font-mono` (JetBrains Mono)

| Level | Size | Weight |
|---|---|---|
| Page Title | 24px (text-2xl) | Semibold |
| Section Title | 18px (text-lg) | Semibold |
| Card Title | 16px (text-base) | Semibold |
| Body | 14px (text-sm) | Normal |
| Caption | 12px (text-xs) | Normal |

### Spacing (Tailwind scale)

- Page padding: `p-6`
- Card padding: `p-4`
- Gap antar elemen form: `gap-4`
- Gap antar card di grid: `gap-4`

### Components (PrimeVue)

Gunakan komponen PrimeVue yang sudah ada, jangan bikin ulang. Komponen yang di-reuse:

| Kebutuhan | Komponen PrimeVue |
|---|---|
| Form | `InputText`, `InputNumber`, `Dropdown`, `Textarea`, `FileUpload`, `AutoComplete` |
| Data | `DataTable` + `Column`, `Paginator` |
| Feedback | `Toast` (global), `ConfirmDialog` |
| Navigation | `Menubar`, `Sidebar`, `Breadcrumb` |
| Action | `Button`, `SplitButton`, `SpeedDial` |
| Modal | `Dialog` |
| Status | `Tag`, `Badge`, `Chip` |
| Misc | `Card`, `Divider`, `Skeleton`, `ProgressBar`, `Toolbar` |

---

## Layout

### AuthLayout (Login)
```
┌──────────────────────────────────┐
│                                  │
│         [ Logo Aplikasi ]        │
│                                  │
│     ┌────────────────────┐       │
│     │    Login Form      │       │
│     │  Email             │       │
│     │  Password          │       │
│     │  [Login Button]    │       │
│     └────────────────────┘       │
│                                  │
└──────────────────────────────────┘
```

### DashboardLayout (Authenticated)
```
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │ Header: [Breadcrumb]     [User Avatar ▼]    │
│          ├──────────────────────────────────────────────┤
│ Dashboard │                                              │
│ Produk    │         <router-view />                     │
│ Stok Masuk│         (halaman konten)                    │
│ Stok Kluar│                                              │
│ RMA       │                                              │
│ Opname    │                                              │
│ Laporan   │                                              │
│ Pengguna  │                                              │
│ (admin)   │                                              │
│           │                                              │
└──────────┴──────────────────────────────────────────────┘
```

- Sidebar: lebar 240px, collapse-able, highlight item aktif.
- Header: sticky top, tinggi 56px.
- Konten: scrollable, padding `p-6`.

---

## Pola Halaman Umum

### List Page (Produk, Receipt, Issue, RMA, Opname, Users)

1. **Toolbar atas**: Judul halaman (kiri) + [Button Tambah] (kanan).
2. **Filter bar** (opsional): search input + dropdown filter + date range.
3. **DataTable**: kolom-kolom sesuai entitas, baris terakhir = aksi (edit/detail icon button).
4. **Pagination**: bawah tabel.

### Detail Page

1. **Header**: judul + badge status + tombol aksi (confirm, cancel, approve) sesuai state.
2. **Info card**: informasi utama entitas (supplier, tanggal, user, catatan).
3. **Items table**: daftar item di bawahnya.

### Form Page / Modal

- Gunakan `Dialog` PrimeVue untuk form sederhana (user, produk edit).
- Gunakan full page untuk form kompleks (goods receipt + serial number).
- Validasi inline Zod (via `@vee-validate/zod` + `vee-validate`).
- Submit button disabled saat loading / invalid.

---

## Konvensi Komponen Vue

### Struktur File Komponen

```vue
<script setup lang="ts">
// 1. Imports
// 2. Props & Emits
// 3. Stores
// 4. Reactive state
// 5. Computed
// 6. Methods / Actions
// 7. Lifecycle (onMounted, watchers)
</script>

<template>
  <!-- Template -->
</template>

<style scoped>
/* Scoped styles — minimal, utamakan Tailwind utility class */
</style>
```

### Rules

- **Gunakan `<script setup lang="ts">`**, hindari Options API.
- **Props** selalu punya type dan default.
- **Composables** untuk logic yang digunakan di 2+ komponen.
- **Pinia store actions** adalah satu-satunya tempat yang memanggil API. Komponen tidak import Axios.
- **Tailwind utility class** sebagai styling utama. Scoped CSS hanya untuk hal yang tidak bisa dicapai Tailwind.
- **v-model binding** untuk semua form field.
- **Loading state**: tampilkan skeleton (komponen `<Skeleton>` PrimeVue) saat data fetching, bukan spinner kosong.
- **Empty state**: tampilkan pesan + ikon ketika tabel/list kosong.
- **Error state**: Toast error + inline error message jika perlu.

### Responsive

- Mobile-first tailwind breakpoints: `sm:` `md:` `lg:` `xl:`.
- Tabel: horizontal scroll di mobile (`overflow-x-auto`).
- Sidebar: drawer overlay di mobile, persistent di desktop.
- Form: stack vertikal di mobile, inline di desktop untuk form pendek.

---

## Halaman Kunci

### Dashboard (`/`)

- 4 card statistik di atas: Total Produk, Unit Tersedia, Nilai Inventori, Low Stock Alert.
- Chart: pie chart stok per kategori (gunakan library ringan: `chart.js` via `vue-chartjs`).
- Tabel: top 10 produk low stock.

### Produk (`/products`)

- List produk dengan kolom: SKU, Nama, Brand, Kategori, Stok, Harga.
- Klik baris → detail produk: info + tabel serial number.
- Tombol "Cek Garansi" di header tabel serial number → modal input serial → tampilkan info garansi.

### Goods Receipt (`/goods-receipts`)

- Tombol "Tambah" → full page form: supplier, tanggal, items grid + tombol "Konfirmasi".
- Saat konfirmasi: modal input serial number dengan jumlah field = quantity per item.
- Validasi serial number duplicate sebelum submit.

### Goods Issue (`/goods-issues`)

- Tombol "Tambah" → full page form: tanggal, catatan, auto-complete pencarian serial number (filter: `in_stock`).
- Konfirmasi: konfirmasi dialog, setelah OK → stok berkurang, serial status = sold.

### RMA (`/rmas`)

- List RMA: RMA number, customer, serial number, produk, status (tag).
- Detail RMA: info + update status dropdown + resolusi textarea.
- Status flow visual: stepper horizontal `Received → Processing → Completed/Rejected`.

### Stock Opname (`/stock-opnames`)

- Sesuai daftar opname dengan status badge.
- Detail: 2 kolom per produk (system qty vs physical qty) + selisih (merah jika minus).
- Saat input: form grid, isi physical quantity per produk.

### Users (`/users`) — hanya admin

- Tabel user: email, nama, role (tag), status aktif.
- Tombol tambah → modal form: email, nama, role dropdown, warehouse dropdown.
