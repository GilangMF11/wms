**PRODUCT REQUIREMENTS DOCUMENT**

**Warehouse Management System (WMS)**

Untuk Toko Retail Elektronik

Versi 1.0

Juli 2026

# Daftar Isi

# 1\. Ringkasan Proyek

Dokumen ini menjelaskan kebutuhan produk untuk pengembangan Warehouse Management System (WMS) bagi toko retail elektronik yang sudah beroperasi. Saat ini pencatatan stok dan transaksi dilakukan secara campuran (sebagian manual, sebagian menggunakan spreadsheet), sehingga rawan selisih stok, sulit dilacak, dan tidak efisien seiring pertumbuhan bisnis.

WMS ini dibangun sebagai sistem yang berdiri sendiri (standalone), belum terintegrasi dengan sistem kasir (POS), dengan tujuan menjadi fondasi digitalisasi manajemen gudang sebelum integrasi yang lebih luas dilakukan pada fase berikutnya.

## 1.1 Latar Belakang

- Toko sudah berjalan dengan pencatatan stok yang tidak konsisten (campuran manual & spreadsheet).
- Produk elektronik memerlukan pelacakan per unit (serial number) untuk keperluan garansi dan pencegahan kehilangan/tertukar barang.
- Skala toko saat ini masih dalam tahap konsep, namun sistem perlu dirancang agar siap berkembang ke multi-cabang.

## 1.2 Tujuan Produk

- Menyediakan pencatatan stok yang akurat dan real-time.
- Melacak setiap unit produk elektronik melalui serial number.
- Mengelola masa garansi dan proses retur (RMA) secara terstruktur.
- Menyediakan laporan dasar untuk pengambilan keputusan restock dan operasional gudang.
- Membangun arsitektur yang scalable untuk mendukung ekspansi ke multi-cabang di masa depan.

## 1.3 Target Pengguna

| **Peran**         | **Deskripsi Singkat**                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Admin Gudang      | Mengelola master data produk, approve transaksi besar, mengelola user. |
| Staf Gudang       | Input stok masuk, stok keluar, stock opname harian.                    |
| Kepala Toko/Owner | Memantau dashboard, laporan, dan performa stok secara keseluruhan.     |

# 2\. Ruang Lingkup

## 2.1 Dalam Lingkup (In Scope) - Fase 1 (MVP)

- Master data produk dengan pelacakan serial number.
- Pencatatan stok masuk (goods receipt) dari supplier.
- Pencatatan stok keluar (goods issue) secara manual, belum terhubung POS.
- Manajemen garansi (warranty tracking).
- RMA/retur sederhana.
- Stock opname.
- Dashboard dan laporan dasar.

## 2.2 Luar Lingkup (Out of Scope) - Ditunda ke Fase 2

- Integrasi POS/kasir secara real-time.
- Manajemen multi-cabang penuh (transfer antar gudang, dsb).
- Integrasi marketplace/e-commerce (Tokopedia, Shopee, dll).
- Laporan lanjutan (fast/slow moving, analisis performa supplier).
- Fitur manufaktur (BOM, firmware tracking, ESD handling) - tidak relevan untuk retail.

# 3\. Kebutuhan Fungsional

## 3.1 Master Data Produk

| **ID** | **Kebutuhan**                                                                                 | **Prioritas** |
| ------ | --------------------------------------------------------------------------------------------- | ------------- |
| F-01   | Sistem dapat menyimpan data produk: nama, kategori, brand, SKU, harga beli, harga jual, foto. | Wajib         |
| F-02   | Sistem dapat menyimpan serial number unik untuk setiap unit produk.                           | Wajib         |
| F-03   | Sistem dapat mengelompokkan produk dalam bentuk bundle/paket (misal HP + charger + case).     | Sebaiknya     |
| F-04   | Sistem dapat mencatat kondisi/grading produk (baru, refurbished, display unit, rusak).        | Sebaiknya     |

## 3.2 Stok Masuk (Goods Receipt)

| **ID** | **Kebutuhan**                                                                             | **Prioritas** |
| ------ | ----------------------------------------------------------------------------------------- | ------------- |
| F-05   | Staf gudang dapat mencatat penerimaan barang dari supplier beserta jumlah dan harga beli. | Wajib         |
| F-06   | Sistem otomatis meminta input serial number untuk setiap unit yang diterima.              | Wajib         |
| F-07   | Sistem memperbarui stok secara otomatis setelah barang diterima dan dikonfirmasi.         | Wajib         |

## 3.3 Stok Keluar (Goods Issue)

| **ID** | **Kebutuhan**                                                                   | **Prioritas** |
| ------ | ------------------------------------------------------------------------------- | ------------- |
| F-08   | Staf gudang dapat mencatat barang keluar secara manual saat terjadi penjualan.  | Wajib         |
| F-09   | Sistem mengurangi stok secara otomatis dan mencatat serial number yang terjual. | Wajib         |
| F-10   | Sistem mencatat tanggal jual sebagai acuan mulainya masa garansi.               | Wajib         |

## 3.4 Manajemen Garansi (Warranty)

| **ID** | **Kebutuhan**                                                                                  | **Prioritas** |
| ------ | ---------------------------------------------------------------------------------------------- | ------------- |
| F-11   | Sistem menghitung otomatis masa berakhir garansi berdasarkan kategori produk dan tanggal jual. | Wajib         |
| F-12   | Sistem dapat menampilkan status garansi (aktif/kedaluwarsa) berdasarkan serial number.         | Wajib         |
| F-13   | Admin dapat mengatur durasi garansi berbeda per kategori produk.                               | Sebaiknya     |

## 3.5 RMA / Retur

| **ID** | **Kebutuhan**                                                                               | **Prioritas** |
| ------ | ------------------------------------------------------------------------------------------- | ------------- |
| F-14   | Staf dapat mencatat retur barang dari pelanggan berdasarkan serial number.                  | Wajib         |
| F-15   | Sistem melacak status retur: Diterima → Diproses → Selesai (diganti/diperbaiki/ditolak).    | Wajib         |
| F-16   | Sistem mencatat retur ke supplier untuk barang cacat pabrik, terpisah dari retur pelanggan. | Sebaiknya     |

## 3.6 Stock Opname

| **ID** | **Kebutuhan**                                                                         | **Prioritas** |
| ------ | ------------------------------------------------------------------------------------- | ------------- |
| F-17   | Staf dapat melakukan penghitungan stok fisik dan membandingkannya dengan data sistem. | Wajib         |
| F-18   | Sistem mencatat selisih stok dan menyimpan riwayat penyesuaian (adjustment log).      | Wajib         |

## 3.7 Dashboard dan Laporan

| **ID** | **Kebutuhan**                                                              | **Prioritas** |
| ------ | -------------------------------------------------------------------------- | ------------- |
| F-19   | Dashboard menampilkan total stok per kategori dan nilai inventori.         | Wajib         |
| F-20   | Sistem menampilkan notifikasi produk dengan stok rendah (low stock alert). | Wajib         |
| F-21   | Sistem menghasilkan laporan garansi aktif dan riwayat RMA.                 | Sebaiknya     |

## 3.8 Manajemen Pengguna

| **ID** | **Kebutuhan**                                                                                            | **Prioritas** |
| ------ | -------------------------------------------------------------------------------------------------------- | ------------- |
| F-22   | Sistem mendukung login dengan role: Admin, Staf Gudang, Kepala Toko.                                     | Wajib         |
| F-23   | Setiap aksi penting (stok masuk/keluar/adjustment) tercatat pada audit trail dengan nama user dan waktu. | Wajib         |

# 4\. Kebutuhan Non-Fungsional

- Sistem dapat diakses melalui web (desktop) dan mendukung tampilan mobile-friendly untuk staf gudang.
- Waktu respons pencarian produk/serial number kurang dari 2 detik.
- Data stok tersimpan aman dengan backup otomatis harian.
- Arsitektur database dirancang mendukung penambahan cabang (multi-warehouse) tanpa migrasi ulang skema.
- Setiap transaksi memiliki log audit yang tidak dapat dihapus oleh user biasa.

# 5\. Rekomendasi Arsitektur & Teknologi

Berdasarkan kebutuhan di atas dan kesesuaian dengan stack yang umum digunakan untuk proyek serupa, berikut rekomendasi teknis:

| **Komponen**                            | **Rekomendasi**                      |
| --------------------------------------- | ------------------------------------ |
| Frontend Web (Admin/Dashboard)          | SvelteKit                            |
| Mobile App (Staf Gudang - scan barcode) | Flutter                              |
| Backend/API                             | Node.js (REST API)                   |
| Database                                | PostgreSQL                           |
| Autentikasi                             | JWT-based, role-based access control |
| Barcode/QR Scanning                     | Kamera perangkat mobile via Flutter  |

Catatan desain database: meskipun MVP berjalan untuk satu toko, tabel inti (produk, stok, transaksi) sebaiknya sudah menyertakan kolom store_id/warehouse_id sejak awal, sehingga penambahan cabang di Fase 2 tidak memerlukan migrasi skema besar.

# 6\. Peran Pengguna & Hak Akses

| **Fitur**           | **Admin Gudang** | **Staf Gudang** | **Kepala Toko** |
| ------------------- | ---------------- | --------------- | --------------- |
| Master data produk  | Kelola penuh     | Lihat saja      | Lihat saja      |
| Stok masuk/keluar   | Kelola penuh     | Input           | Lihat saja      |
| Stock opname        | Approve          | Input           | Lihat saja      |
| RMA/Retur           | Kelola penuh     | Input           | Lihat saja      |
| Dashboard & laporan | Lihat penuh      | Lihat terbatas  | Lihat penuh     |
| Manajemen user      | Kelola penuh     | Tidak ada akses | Tidak ada akses |

# 7\. Roadmap Pengembangan

## 7.1 Fase 1 - MVP

- Master data produk & serial number
- Stok masuk & stok keluar manual
- Warranty tracking
- RMA sederhana
- Stock opname
- Dashboard & laporan dasar

## 7.2 Fase 2 - Pengembangan Lanjutan

- Integrasi POS real-time
- Dukungan multi-cabang penuh (transfer antar gudang)
- Integrasi marketplace/e-commerce
- Laporan lanjutan (fast/slow moving, performa supplier)

# 8\. Asumsi & Risiko

## 8.1 Asumsi

- Toko akan tetap beroperasi dengan pencatatan manual selama transisi ke sistem baru; diperlukan periode migrasi data.
- Jumlah cabang saat dokumen ini dibuat belum ditentukan; desain sistem mengasumsikan potensi multi-cabang di masa depan.
- Sistem kasir (POS) akan diintegrasikan pada fase berikutnya, sehingga stok keluar Fase 1 dicatat secara manual.

## 8.2 Risiko

| **Risiko**                                                                                         | **Mitigasi**                                                                   |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Data migrasi dari catatan manual/Excel tidak lengkap atau tidak konsisten.                         | Lakukan audit stok fisik menyeluruh sebelum go-live sebagai baseline data.     |
| Staf gudang belum terbiasa dengan sistem digital, berisiko human error saat input.                 | Sediakan pelatihan dan panduan penggunaan sebelum implementasi penuh.          |
| Stok keluar manual (belum terhubung POS) berisiko telat dicatat, menyebabkan selisih dengan kasir. | Terapkan SOP: setiap transaksi kasir wajib diinput ke WMS pada hari yang sama. |