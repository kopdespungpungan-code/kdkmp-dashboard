# Dashboard Toko KDKMP Pungpungan

Next.js 15 (App Router) + Supabase + Tailwind. Bahasa antarmuka: Indonesia.

## Halaman
| Menu | Fungsi |
|---|---|
| Ringkasan | Omzet hari ini, grafik 14 hari, terlaris 30 hari, daftar perlu perhatian (habis, menipis, hampir expired), nota terakhir |
| Penjualan | Daftar nota, detail nota, buat nota baru (stok toko berkurang otomatis) |
| Produk | Cari dan filter (perlu perhatian, belum ada SKU, belum ada harga jual), edit SKU, harga, batas stok. Tombol **Input SO** untuk stock opname per petugas |
| Stok | Terima barang (dengan expired), pindah gudang dan toko, koreksi opname |
| Retur | Catat retur ke supplier, expired, rusak, atau dari pembeli |

## Pasang
1. Di Supabase SQL Editor jalankan berurutan: `kdkmp_retail_simple.sql`, `seed_kdkmp_retail.sql`, lalu `supabase/dashboard.sql` (view untuk dashboard).
   Untuk fitur SO, jalankan juga:
   - `supabase/so_gondola.sql` (tabel + view hasil SO)
   - `supabase/product_gondola.sql` (pemetaan produk → gondola/lokasi + tingkat)
   - `supabase/migration_tingkat_1_6.sql` (tingkat 1-6 dan boleh kosong)
   - `supabase/seed_product_gondola.sql` (isi pemetaan awal dari Excel; dibuat oleh skrip impor)
   - `supabase/ocr.sql` bila memakai impor struk.
2. Buat akun staf: Supabase Dashboard, Authentication, Users, Add user (email + kata sandi). Pendaftaran bebas tidak disediakan di aplikasi.
3. Salin `.env.example` menjadi `.env.local`, isi URL dan anon key dari Project Settings, API.
4. Jalankan:
   ```
   npm install
   npm run dev
   ```
   Buka http://localhost:3000

## Input SO (Stock Opname per petugas)
Menu **Produk → Input SO** (`/produk/so`). Struktur mengikuti sheet Excel SO Grocery:
- Pilih **Nama Petugas** (Vyrda, Pandu, Rista, Dedik, Imel, Lia) — wilayah gondola/lokasi otomatis menyesuaikan.
- Pilih **Gondola** (1–60) atau **Lokasi** (untuk Lia), lalu **Tingkat** dan **Tanggal Hitung**.
- Tambah baris barang dari dropdown (nama produk), isi **Qty Fisik**. Selisih dihitung otomatis dari stok sistem toko.
- Isi **Rusak/EXP** dan **Keterangan** bila perlu, lalu **Simpan SO**.

Data tersimpan di tabel `so_gondola` (satu baris per tanggal + petugas + gondola/lokasi + tingkat + produk).
Simpan ulang pada tanggal/petugas/gondola/produk yang sama akan memperbarui baris (upsert), bukan menumpuk.

## SO Gondola (`/laporan-harian/so-gondola`)
Halaman cetak + input SO per gondola. Berbeda dari `/produk/so` yang memilih barang bebas,
halaman ini **hanya menampilkan barang yang terpetakan ke gondola/lokasi + tingkat**.

- Pilih **Petugas** → semua gondola dan **tingkat 1-6 selalu tampil**, termasuk tingkat yang
  belum ada barangnya, sehingga barang bisa langsung ditempatkan.
- Tingkat kosong menampilkan tombol **Tambah** → pilih barang → **Tambah ke sini**
  (menulis ke tabel pemetaan `product_gondola`).
- **Gondola** dan **Tingkat** di filter bersifat opsional (default "Semua"), plus kotak pencarian.
- **Tingkat bisa dikoreksi langsung per baris** (1-6, atau dikosongkan). Perubahan tingkat
  ikut disimpan ke tabel pemetaan `product_gondola`, sehingga SO berikutnya memakai data terbaru.
- Barang yang tingkatnya kosong tidak bisa diisi Qty Fisik sampai tingkatnya ditentukan.
- Tombol **Cetak SO** menghasilkan form SO siap tanda tangan.
- Tombol **Simpan** menyimpan Qty Fisik yang diisi ke `so_gondola` sekaligus perubahan tingkat.
- Badge jadwal menandai gondola yang sudah lewat 3 hari dari SO terakhir.
- Di HP tabel berubah menjadi kartu, input 16px (tidak memicu auto-zoom), tombol Simpan menempel di bawah.

## Lokasi produk (product tracking)
Menu **Produk** dan halaman detail produk menampilkan **Lokasi** tiap barang:

- `Gondola 5 · T2` bila barang ditempatkan di gondola tertentu,
- nama lokasi (mis. `DEPAN KASIR · T1`) untuk wilayah Lia,
- **`Gudang`** bila barang belum ditempatkan di gondola/lokasi mana pun.

Sumbernya tabel `product_gondola`, sama dengan yang dipakai halaman SO Gondola, jadi lokasi di
daftar produk dan tampilan SO selalu konsisten.

### Memperbarui pemetaan produk → gondola
Pemetaan awal dibuat dari sheet petugas di `supabase/seed/DATABASE POS KDKMP PUNGPUNGAN.xlsx`:

```
py -3 scripts/import_pemetaan_so.py
```

Skrip menghasilkan `supabase/seed_product_gondola.sql`. Jalankan berurutan di Supabase SQL Editor:

1. `supabase/product_gondola.sql`
2. `supabase/migration_tingkat_1_6.sql` (wajib, agar tingkat 1-6 dan boleh kosong)
3. `supabase/seed_product_gondola.sql`

Skrip akan melaporkan jumlah baris per petugas. Query terakhir di file seed menampilkan
nama barang di Excel yang **tidak ketemu** di tabel `products`, untuk dicek manual.

Jika tabel `product_gondola` kosong atau belum dibuat, halaman SO Gondola menampilkan
peringatan yang jelas (bukan halaman kosong).

### Database lama: kolom `so_gondola`
Skema `so_gondola` versi lama belum punya kolom `keterangan` dan `gondola_key`, sehingga
sebelumnya **setiap klik Simpan gagal**. Aplikasi sekarang menyimpan tanpa bergantung pada
dua kolom itu (baris lama dicari dulu lalu diperbarui per `id`), jadi Simpan tetap berhasil.

Agar kolom **Catatan** ikut tersimpan, jalankan sekali di Supabase SQL Editor:

```sql
-- supabase/migration_so_gondola_kolom.sql
```

Migrasi ini hanya menambah kolom (tidak menghapus data). Selama belum dijalankan, SO tetap
tersimpan dan aplikasi memberi tahu bahwa catatan belum tersimpan.



## Deploy (Vercel)

### 1. Database Supabase (lakukan sekali, sebelum deploy)
Jalankan berurutan di **Supabase SQL Editor** pada project yang dipakai produksi:

1. `supabase/so_gondola.sql`
2. `supabase/product_gondola.sql`
3. `supabase/migration_tingkat_1_6.sql`
4. `supabase/migration_so_gondola_kolom.sql`
5. `supabase/seed_product_gondola.sql`
6. seed lain yang dipakai (`supabase/seed.sql`, dsb.)

Cek cepat: halaman **SO Gondola** harus menampilkan gondola, bukan peringatan merah.

### 2. Push kode ke GitHub
Repo: `https://github.com/kopdespungpungan-code/kdkmp-dashboard`

```bash
git add -A
git commit -m "Siap deploy: SO gondola, tracking lokasi, perbaikan simpan"
git push origin master
```

`.env.local` **tidak** ikut ter-commit (sudah di `.gitignore`).

### 3. Import di Vercel
1. Vercel → **Add New → Project** → pilih repo tersebut.
2. Framework terdeteksi **Next.js** (biarkan default: `npm install`, `npm run build`).
3. Node.js version: **22.x** (mengikuti `.nvmrc` dan `engines` di `package.json`).
4. Isi **Environment Variables** (Production + Preview):

| Variable | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ya | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ya | anon/public key Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | tidak | key format baru |
| `GEMINI_API_KEY` atau `OPENAI_API_KEY` | tidak | OCR laporan/absensi |
| `OCR_BASE_URL`, `OCR_API_KEY`, `OCR_MODEL` | tidak | OCR nota penjualan |

5. Klik **Deploy**. Build memakai `npm` (`package-lock.json` sudah ada).

`vercel.json` sengaja tidak dipakai: pengaturan `regions` bisa gagal di plan **Hobby**
(Hobby hanya boleh satu region). Kalau kamu memakai plan Pro dan ingin fungsi jalan di
Singapura, buat `vercel.json` berisi:

```json
{ "regions": ["sin1"] }
```

Kalau project Supabase-mu di region lain, sesuaikan nilainya.

### 4. Setelah deploy
1. Buat user login di **Supabase → Authentication → Users → Add user**
   (email + password, centang *Auto Confirm User*).
2. Buka domain Vercel → login → cek menu **Produk** (harus ada baris *Lokasi*) dan
   **SO Gondola** (semua tingkat 1–6 tampil).
3. Coba **Simpan SO** sekali, lalu cek di Supabase: `select * from so_gondola order by id desc limit 5;`

### Tidak bisa login setelah deploy

Buka **`https://<domain-vercel>/api/health`** lebih dulu. Jawabannya langsung menunjukkan masalahnya:

| Hasil `/api/health` | Artinya | Tindakan |
|---|---|---|
| `"status": "env-belum-diisi"` | Vercel belum punya env Supabase | Settings → Environment Variables → isi 2 variabel → **Redeploy** |
| `"status": "url-tidak-valid"` | URL Supabase salah ketik | Perbaiki `NEXT_PUBLIC_SUPABASE_URL` |
| `auth.statusCode: 401` / `database.statusCode: 401` | **ANON KEY salah** | Ambil ulang dari Supabase → Settings → API |
| `"status": "ok"` tapi login gagal | **User belum ada / belum dikonfirmasi** | Supabase → Authentication → Users → **Add user**, centang *Auto Confirm User* |

Catatan penting:

- Aplikasi ini **tidak punya halaman daftar**. Akun dibuat manual oleh admin di Supabase Auth.
- Akun dashboard Supabase (yang dipakai untuk login ke supabase.com) **bukan** akun aplikasi ini.
- Kalau pesan di halaman login menyebut *"Email akun ini belum dikonfirmasi"*, buka user tersebut di
  Authentication → Users lalu klik **Confirm email**.
- Setelah mengubah Environment Variables di Vercel, wajib **Redeploy** — env lama tidak ikut berubah
  pada deployment yang sudah ada.
- Pastikan kamu membuka **Production URL** (bukan Preview), karena Preview bisa memakai env berbeda.

### Catatan penting di Vercel
- **Tanpa login, semua halaman diarahkan ke `/login`** oleh middleware. Kalau muncul 404/redirect
  terus, berarti user belum dibuat atau env Supabase salah.
- **Batas body request Vercel 4,5 MB.** OCR yang mengirim banyak halaman PDF sekaligus bisa
  ditolak. Kirim beberapa halaman per permintaan.
- **Batas waktu fungsi:** OCR nota sudah `maxDuration = 60`, OCR laporan juga 60 detik.
  Di plan Hobby angka ini maksimal; kalau tetap timeout, kurangi jumlah gambar per request.
- `outputFileTracingRoot` di `next.config.mjs` sudah dikunci ke folder proyek, supaya build
  tidak salah mendeteksi root saat ada `package-lock.json` lain di komputer.
- Jangan commit `.env.local`. Kalau tidak sengaja ter-commit, ganti (rotate) key Supabase
  dan key OCR.

### Alternatif: deploy tanpa GitHub (Vercel CLI)
```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```
Saat ditanya, tetap isi Environment Variables yang sama.


## Catatan keamanan
- Semua data dilindungi RLS dan hanya bisa diakses user yang sudah masuk. Policy bawaan skema masih "semua user authenticated boleh semuanya". Kalau nanti ada banyak staf, batasi per peran.
- View di `dashboard.sql` memakai `security_invoker = true` supaya mengikuti RLS.
- Jangan pernah memakai service role key di aplikasi ini.

## Alur data
- Nota baru: insert `sales` + `sale_items`, trigger `trg_sale` mengurangi `products.stok_toko`.
- Retur: insert `returns`, trigger `trg_return` (dari pembeli menambah, lainnya mengurangi stok toko).
- Stok: insert `stock_log`, trigger `trg_stock_log` mengubah stok dan `expired_terdekat`.
