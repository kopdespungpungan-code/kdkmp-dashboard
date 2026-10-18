# Dashboard Toko KDKMP Pungpungan

Next.js 15 (App Router) + Supabase + Tailwind. Bahasa antarmuka: Indonesia.

## Halaman
| Menu | Fungsi |
|---|---|
| Ringkasan | Omzet hari ini, grafik 14 hari, terlaris 30 hari, daftar perlu perhatian (habis, menipis, hampir expired), nota terakhir |
| Penjualan | Daftar nota, detail nota, buat nota baru (stok toko berkurang otomatis) |
| Produk | Cari dan filter (perlu perhatian, belum ada SKU, belum ada harga jual), edit SKU, harga, batas stok |
| Stok | Terima barang (dengan expired), pindah gudang dan toko, koreksi opname |
| Retur | Catat retur ke supplier, expired, rusak, atau dari pembeli |

## Pasang
1. Di Supabase SQL Editor jalankan berurutan: `kdkmp_retail_simple.sql`, `seed_kdkmp_retail.sql`, lalu `supabase/dashboard.sql` (view untuk dashboard).
2. Buat akun staf: Supabase Dashboard, Authentication, Users, Add user (email + kata sandi). Pendaftaran bebas tidak disediakan di aplikasi.
3. Salin `.env.example` menjadi `.env.local`, isi URL dan anon/publishable key dari Project Settings, API.
4. Jalankan:
   ```
   npm install
   npm run dev
   ```
   Buka http://localhost:3000

## Deploy (Vercel)
Impor repo, isi dua variabel lingkungan yang sama, deploy.

## Catatan keamanan
- Semua data dilindungi RLS dan hanya bisa diakses user yang sudah masuk. Policy bawaan skema masih "semua user authenticated boleh semuanya". Kalau nanti ada banyak staf, batasi per peran.
- View di `dashboard.sql` memakai `security_invoker = true` supaya mengikuti RLS.
- Jangan pernah memakai service role key di aplikasi ini.

## Alur data
- Nota baru: insert `sales` + `sale_items`, trigger `trg_sale` mengurangi `products.stok_toko`.
- Retur: insert `returns`, trigger `trg_return` (dari pembeli menambah, lainnya mengurangi stok toko).
- Stok: insert `stock_log`, trigger `trg_stock_log` mengubah stok dan `expired_terdekat`.
