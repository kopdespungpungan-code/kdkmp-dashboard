# Dashboard Toko KDKMP Pungpungan

Next.js 15 (App Router) + Supabase + Tailwind. Bahasa antarmuka: Indonesia.

## Halaman
| Menu | Fungsi |
|---|---|
| Landing | Halaman publik di `/` berisi ringkasan fitur dan tombol masuk ke dashboard |
| Ringkasan | Di `/dashboard`: omzet hari ini, grafik 14 hari, terlaris 30 hari, daftar perlu perhatian (habis, menipis, hampir expired), nota terakhir |
| Penjualan | Daftar nota, detail nota, buat nota baru (stok toko berkurang otomatis) |
| Produk | Cari dan filter (perlu perhatian, belum ada foto, belum ada SKU, belum ada harga jual), edit SKU, harga, batas stok, dan foto produk. Tombol **Input SO** untuk stock opname per petugas |
| Stok | Terima barang (dengan tanggal/jam penerimaan dan expired), tambah barang baru langsung dari form, pindah gudang dan toko, koreksi opname, plus unggah dokumentasi dan STB |
| Retur | Catat retur ke supplier, expired, rusak, atau dari pembeli |
| Pengaturan | Atur Base URL, API key, model, dan reasoning OCR nota dari dashboard |

### Statistik landing
Landing page menampilkan total omzet sejak **1 Mei 2025**, jumlah nota, pcs terjual, dan 5 produk terlaris. Data diambil dari RPC `landing_stats` (`supabase/landing_stats.sql`) yang hanya mengembalikan agregat dan boleh diakses anon. Jalankan script tersebut agar angka tampil; tanpa script, landing menampilkan tanda "—". Cek dengan `select public.landing_stats();` di Supabase SQL Editor.

### Fitur landing
- Font **Inter** (Figma: best fonts for websites), logo kolaborasi **APN × KOPDES Pungpungan**, dan watermark pembuat.
- Header lengket (sticky) yang mobile-first, menu seluler yang menutup otomatis setelah diklik, serta tombol kembali ke atas.
- Toggle mode terang/gelap di header. Tema disimpan di `localStorage` (`kdkmp-theme`).
- **Ramalan cuaca Pungpungan** di navbar memakai Open-Meteo (tanpa API key), menampilkan suhu, kelembapan, angin, dan prakiraan 3 hari.
- **Kalender tanam** untuk warga Pungpungan: pilihan bulan, musim, tanaman, dan kegiatan. Ini panduan umum; tetap ikuti kondisi lapangan dan penyuluh setempat.

## Pasang
1. Di Supabase SQL Editor jalankan berurutan: `kdkmp_retail_simple.sql`, `seed_kdkmp_retail.sql`, lalu `supabase/dashboard.sql` (view untuk dashboard), lalu `supabase/subsidi.sql` (penjualan barang subsidi), lalu `supabase/subsidi_per_item.sql` (KK bulk atau KK per barang), lalu `supabase/produk_foto.sql` (foto produk + bucket Storage), lalu `supabase/stok_dokumen.sql` (dokumentasi & STB stok), lalu `supabase/landing_stats.sql` (statistik publik landing page).
   Untuk fitur SO, jalankan juga:
   - `supabase/so_gondola.sql` (tabel + view hasil SO)
   - `supabase/product_gondola.sql` (pemetaan produk → gondola/lokasi + tingkat)
   - `supabase/migration_tingkat_1_6.sql` (tingkat 1-6 dan boleh kosong)
   - `supabase/seed_product_gondola.sql` (isi pemetaan awal dari Excel; dibuat oleh skrip impor)
   - `supabase/ocr.sql` bila memakai impor struk.
   - `supabase/pengaturan.sql` untuk halaman **Pengaturan** (Base URL/API key OCR).
   - `supabase/produk_foto.sql` untuk foto produk dan bucket Storage `produk`.
   - `supabase/stok_dokumen.sql` untuk upload dokumentasi & STB di menu Stok.
   - `supabase/landing_stats.sql` untuk omzet sejak Mei 2025 dan produk terlaris di landing page.
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

## Penjualan barang subsidi
Barang subsidi (Pupuk NPK, Pupuk Urea, LPG, SPHP, Minyak Kita) ditandai per produk
lewat **Produk → pilih produk → centang "Barang subsidi"**. Produk yang sudah ada
otomatis ditandai berdasarkan nama saat `supabase/subsidi.sql` dijalankan:
pola `NPK`, `Urea`, `LPG`/`Elpiji`/`Gas 3`, `SPHP`, dan `Minyak Kita`/`Minyakita`.
Pupuk jenis lain (ZA, SP-36, Phonska, dsb.) bisa ditinjau lewat filter
**Produk → Kandidat subsidi** lalu dicentang manual.

Saat membuat nota yang berisi barang subsidi:
- **No. KK / NIK wajib diisi 16 digit** sebelum nota bisa disimpan.
- Ada dua cara input:
  - **Satu No. KK untuk semua barang subsidi** (bulk), atau
  - **No. KK berbeda untuk tiap barang**, mis. satu nota berisi subsidi untuk
    beberapa keluarga. Pilih opsi ini lalu isi KK di tiap barang.
- **1 KK hanya boleh 1 transaksi subsidi per minggu** (Senin–Minggu, WIB).
  Bila KK sudah pernah transaksi subsidi minggu itu, nota ditolak dan menampilkan
  nomor nota sebelumnya. Aturan ini berlaku untuk mode bulk maupun per barang.
- Aturan dijaga dua lapis: pengecekan di aplikasi dan index unik di database,
  sehingga tetap aman bila dua kasir menyimpan bersamaan.
- Nota subsidi diberi badge **Subsidi** di daftar penjualan dan halaman detail,
  lengkap dengan No. KK. Di daftar, nomor KK disamarkan (4 digit terakhir);
  nota per barang menampilkan **KK per barang** dan rincian KK ada di detail.
- Barang non-subsidi tetap bisa dijual tanpa No. KK.

Jalankan di Supabase SQL Editor: `supabase/subsidi.sql`, lalu
`supabase/subsidi_per_item.sql`. Script boleh dijalankan ulang, tetapi auto-tanda
akan diterapkan lagi; periksa kembali centang manual setelahnya.

### Cek data subsidi & produk ganda
Setelah `supabase/subsidi.sql` dan `supabase/subsidi_per_item.sql`, jalankan
`supabase/cek_subsidi.sql` di Supabase SQL Editor. Script ini hanya membaca data
dan menampilkan:

- ringkasan jumlah produk subsidi,
- lima kategori subsidi: berapa yang ada dan berapa yang sudah ditandai,
- kandidat subsidi yang belum ditandai,
- produk yang ditandai tetapi namanya tidak cocok pola (perlu dicek),
- duplikat nama produk (huruf besar/kecil dan spasi diabaikan),
- duplikat SKU,
- baris nota ganda (produk sama lebih dari sekali dalam satu nota),
- pelanggaran aturan 1 KK = 1 nota subsidi per minggu (bulk maupun per barang).

`supabase/subsidi.sql` juga membuat index unik nama produk **aktif**. Bila masih
ada nama ganda, index tidak dibuat dan SQL Editor menampilkan `NOTICE`; rapikan
nama produk lewat halaman Produk, lalu jalankan ulang blok index tersebut.

## Foto produk

Jalankan sekali `supabase/produk_foto.sql`. Script ini menambah kolom
`products.foto_url`, membuat bucket Storage **`produk`** (public, maksimal 5 MB),
dan mengatur policy upload untuk user yang login.

Cara memakai:
1. Buka **Produk** → pilih produk → bagian **Foto produk** → **Pilih foto**.
2. Foto otomatis diperkecil ke sisi terpanjang 900 px (JPEG) sebelum diunggah,
   jadi tetap ringan. Format asli: JPG, PNG, atau WebP.
3. Foto langsung tersimpan. Tombol **Hapus** menghapus foto dari produk dan Storage.
4. Gunakan filter **Produk → Belum ada foto** untuk mencari produk yang belum difoto.

Foto tampil di daftar produk, pilihan produk saat membuat nota, baris nota, dan
hasil pencarian produk pada barang OCR yang belum cocok. Foto **tidak mengubah
teks hasil OCR**; foto membantu staff memilih produk yang benar secara visual.
Jika foto produk masih kosong, pilihan produk tetap menampilkan ikon placeholder.

Bila pembuatan bucket ditolak saat menjalankan SQL, buat manual di Supabase
Dashboard → **Storage** → **New bucket**: nama `produk`, centang **Public**,
batas 5 MB, lalu jalankan ulang `supabase/produk_foto.sql`. Semua user yang login
boleh mengganti foto karena aplikasi belum memiliki sistem role admin.

## Barang baru & tanggal penerimaan

Di **Stok → Catat stok**:

- **Tanggal penerimaan** (untuk terima barang) atau **Tanggal catat** (mutasi/opname)
  diisi tanggal **dan jam** dalam WIB. Nilai awal mengikuti waktu saat halaman dibuka.
- Jika barang belum ada di database, pilih jenis **Terima barang**, centang
  **Barang baru — belum ada di database**, lalu isi nama barang dan data opsional
  (SKU, gramasi, supplier, isi per karton, harga beli/jual, batas stok, subsidi).
  Barang dengan nama mengandung NPK, Urea, LPG, SPHP, atau Minyak Kita otomatis
  ditandai subsidi; checkbox **Barang subsidi** dipakai untuk barang lain.
  Barang dibuat otomatis, lalu qty penerimaan langsung menambah stok.
- Opsi barang baru hanya muncul untuk terima barang. Untuk mutasi/opname, pilih
  barang yang sudah ada.
- Nama barang harus unik. SKU yang diisi juga harus unik. Jika bentrok, sistem
  menampilkan pesan agar memilih barang lama atau memakai nama/SKU lain.

## Dokumentasi & STB stok

Jalankan sekali `supabase/stok_dokumen.sql`. Script ini menambah kolom
`stock_log.dokumentasi_path` dan `stock_log.stb_path`, lalu membuat bucket
Storage **`stok`** yang **private** (maksimal 4 MB per file).

Cara memakai:
1. Buka **Stok → Catat stok**.
2. Isi barang, qty, dan data lain seperti biasa.
3. Di bagian **Dokumentasi & STB**:
   - **Dokumentasi**: foto JPG/PNG/WebP. Foto otomatis diperkecil sebelum diunggah.
   - **STB**: file PDF, JPG, PNG, atau WebP (surat terima barang/surat jalan).
4. Klik **Simpan catatan**. File diunggah saat dipilih, lalu disimpan bersama
   catatan stok.

Di **Riwayat stok**, setiap catatan yang punya lampiran menampilkan tombol
**Dokumentasi** (dengan thumbnail) dan **STB**. Karena bucket private, tautan
dibuat sebagai signed URL yang berlaku 1 hari dan hanya bisa dibuat oleh user
yang login. Semua user login boleh upload/hapus lampiran stok.

Bila upload gagal karena bucket/policy belum ada, jalankan ulang
`supabase/stok_dokumen.sql`. Kalau ingin membuat bucket manual: **Storage →
New bucket**, nama `stok`, **jangan** centang Public, limit 4 MB, MIME
`image/jpeg`, `image/png`, `image/webp`, `application/pdf`.

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
6. `supabase/subsidi.sql`
7. `supabase/subsidi_per_item.sql`
8. `supabase/pengaturan.sql`
9. `supabase/produk_foto.sql`
10. `supabase/stok_dokumen.sql`
11. `supabase/landing_stats.sql`
12. seed lain yang dipakai (`supabase/seed.sql`, dsb.)

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
| `GEMINI_API_KEY` | tidak | fallback OCR laporan/absensi bila Pengaturan kosong |
| `OPENROUTER_API_KEY` | tidak | fallback OCR nota & laporan; bisa diisi lewat menu **Pengaturan** |
| `OPENROUTER_OCR_MODEL` | tidak | fallback model; default `qwen/qwen3-vl-30b-a3b-instruct` |
| `OPENROUTER_OCR_REASONING` | tidak | fallback reasoning; default `auto` |
| `OCR_BASE_URL`, `OCR_API_KEY`, `OCR_MODEL` | tidak | endpoint OCR lama (fallback) |

5. Klik **Deploy**. Build memakai `npm` (`package-lock.json` sudah ada).

`vercel.json` sengaja tidak dipakai: pengaturan `regions` bisa gagal di plan **Hobby**
(Hobby hanya boleh satu region). Kalau kamu memakai plan Pro dan ingin fungsi jalan di
Singapura, buat `vercel.json` berisi:

```json
{ "regions": ["sin1"] }
```

Kalau project Supabase-mu di region lain, sesuaikan nilainya.

### OCR nota & laporan (OpenRouter / endpoint kustom)

OCR nota di menu **Penjualan** dan OCR laporan/absensi bisa diatur langsung dari dashboard:

1. Jalankan `supabase/pengaturan.sql` sekali di Supabase SQL Editor.
2. Login ke dashboard, buka menu **Pengaturan**.
3. Isi **Base URL** (`https://openrouter.ai/api/v1` untuk OpenRouter), **API key**
   dari <https://openrouter.ai/keys>, dan model
   **`qwen/qwen3-vl-30b-a3b-instruct`**.
4. Klik **Tes koneksi** untuk memastikan key/base URL/model benar, lalu **Simpan**.
   Perubahan langsung dipakai, tidak perlu restart atau redeploy.

Model default tersebut adalah model vision-language yang dioptimalkan untuk OCR
(32 bahasa, tahan blur/miring/low light), harga sekitar **$0.15/M token input** dan
**$0.60/M token output**. Estimasi biaya OCR **~Rp10–20 per 2 halaman**; per nota
biasanya lebih murah.

Alternatif model:

| Model | Harga input/output per 1M token | Catatan |
|---|---|---|
| `qwen/qwen3-vl-30b-a3b-instruct` | ~$0.15 / $0.60 | Default; fokus OCR, akurasi paling aman |
| `inclusionai/ling-3.0-flash-vl` | ~$0.06 / $0.18 | Value kedua; kuat untuk dokumen/layout |
| `qwen/qwen3.7-flash` | ~$0.03 / $0.13 | Paling murah; cukup untuk PDF tajam |
| `google/gemma-3-4b-it` | ~$0.04 / $0.05 | Murah, tapi teks kecil/nota padat rawan salah |
| `z-ai/glm-5.3-flash` | ~$0.0052 / $0.1985 | Input sangat murah, tapi reasoning wajib |
| `nvidia/nemotron-3.5-super-vl:free` | gratis | Rate limit/antrean; tidak disarankan untuk produksi |

Pengaturan disimpan di tabel `app_settings`. API key tidak pernah dikirim ke browser
dalam bentuk lengkap; halaman hanya menampilkan 4 karakter terakhir. Kalau kolom
pengaturan dikosongkan, aplikasi memakai environment sebagai fallback:

- `OPENROUTER_API_KEY` + `OPENROUTER_OCR_MODEL` + `OPENROUTER_OCR_REASONING`, atau
- `OCR_BASE_URL` + `OCR_API_KEY` + `OCR_MODEL` untuk endpoint lama.

OCR laporan/absensi memakai konfigurasi yang sama. Kalau Base URL/API key kosong,
OCR laporan memakai `GEMINI_API_KEY` sebagai fallback.

Halaman **Pengaturan** bisa dibuka semua user yang sudah login. Batasi akun staf
sesuai kebutuhan karena API key tersimpan di database.

### 4. Setelah deploy
1. Buat user login di **Supabase → Authentication → Users → Add user**
   (email + password, centang *Auto Confirm User*).
2. Buka domain Vercel → login → cek menu **Produk** (harus ada baris *Lokasi*) dan
   **SO Gondola** (semua tingkat 1–6 tampil).
3. Buka **Pengaturan**, isi Base URL + API key OCR, lalu klik **Tes koneksi**.
4. Coba **Simpan SO** sekali, lalu cek di Supabase: `select * from so_gondola order by id desc limit 5;`

### Tidak bisa login setelah deploy

Buka **`https://<domain-vercel>/api/health`** lebih dulu. Jawabannya langsung menunjukkan masalahnya:

| Hasil `/api/health` | Artinya | Tindakan |
|---|---|---|
| `"status": "env-belum-diisi"` | Vercel belum punya env Supabase | Settings → Environment Variables → isi 2 variabel → **Redeploy** |
| `"status": "url-tidak-valid"` | URL Supabase salah ketik | Perbaiki `NEXT_PUBLIC_SUPABASE_URL` |
| `auth.statusCode: 401` / `skema.*.statusCode: 401` | **ANON KEY salah** | Ambil ulang dari Supabase → Settings → API |
| `"status": "skema-belum-dibuat"` | URL & key valid, tapi **project-nya kosong** (belum ada tabel) | Jalankan SQL di folder `supabase/`, **atau** ganti env ke project yang sudah berisi data |
| `"status": "ok"` tapi login gagal | **User belum ada / belum dikonfirmasi** | Supabase → Authentication → Users → **Add user**, centang *Auto Confirm User* |

> **URL dan ANON KEY wajib berasal dari project Supabase yang sama.** Kalau URL dari project A
> dan key dari project B, halaman akan error aneh (tabel tidak ditemukan / key ditolak).
> Cek nama host di `/api/health` — harus sama dengan project yang kamu buka di dashboard.

Catatan penting:

- Aplikasi ini **tidak punya halaman daftar**. Akun dibuat manual oleh admin di Supabase Auth.
- Akun dashboard Supabase (yang dipakai untuk login ke supabase.com) **bukan** akun aplikasi ini.
- Kalau pesan di halaman login menyebut *"Email akun ini belum dikonfirmasi"*, buka user tersebut di
  Authentication → Users lalu klik **Confirm email**.
- Setelah mengubah Environment Variables di Vercel, wajib **Redeploy** — env lama tidak ikut berubah
  pada deployment yang sudah ada.
- Pastikan kamu membuka **Production URL** (bukan Preview), karena Preview bisa memakai env berbeda.

### Catatan penting di Vercel
- **Tanpa login, halaman operasional diarahkan ke `/login`; landing page `/` tetap publik.** Kalau muncul 404/redirect
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
- API key OCR di tabel `app_settings` bisa dibaca semua user yang login (lewat RLS). Halaman **Pengaturan** hanya menampilkan versi tersamar, tetapi batasi akun staf yang dipercaya.
- Jangan pernah memakai service role key di aplikasi ini.

## Alur data
- Nota baru: insert `sales` + `sale_items`, trigger `trg_sale` mengurangi `products.stok_toko`.
- Nota subsidi: `sales.no_kk` + `sales.subsidi`, dicek maksimal 1x per KK per minggu lewat index `uq_sales_subsidi_kk_minggu`.
- Retur: insert `returns`, trigger `trg_return` (dari pembeli menambah, lainnya mengurangi stok toko).
- Stok: insert `stock_log`, trigger `trg_stock_log` mengubah stok dan `expired_terdekat`.
