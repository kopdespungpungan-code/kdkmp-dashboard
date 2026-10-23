// Konten dokumentasi terkompresi untuk konteks AI helper.
// Digunakan oleh /api/docs/ai agar tidak perlu mengirim seluruh halaman.
export const DOCS_SUMMARY = `
DOKUMENTASI DASHBOARD KDKMP PUNGPUNGAN

## PENDAHULUAN
Aplikasi web untuk mengelola operasional toko koperasi: penjualan & nota, stok (toko & gudang), produk, retur, laporan harian, laporan karyawan, pengaturan OCR, tema terang/gelap, statistik publik di landing page.
Stack: Next.js 15 (App Router), Supabase, Tailwind CSS.
Akun dibuat oleh administrator di Supabase Dashboard (tidak ada pendaftaran publik).
Variabel lingkungan: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OCR_BASE_URL, OCR_API_KEY, OCR_MODEL (opsional).
Rute: / (landing publik), /login, /dashboard, /penjualan, /produk, /stok, /retur, /laporan-harian, /laporan-karyawan, /pengaturan, /docs.

## DASHBOARD
Halaman /dashboard: KPI operasional harian (omzet hari ini, grafik 14 hari, produk terlaris 30 hari), daftar perlu perhatian (habis, menipis, hampir expired), nota terakhir.
Data dari view v_omzet_harian, v_terlaris_30hari, v_perlu_perhatian (security_invoker).

## PENJUALAN & NOTA
- Daftar nota dengan filter (tanggal, kasir, status). Klik untuk detail, cetak struk, batalkan.
- Buat nota baru: /penjualan/baru. Tambah barang (cari & pilih), scan struk OCR (opsional), isi No. KK bila ada subsidi, simpan. Stok toko berkurang otomatis.
- Barang subsidi & No. KK: 1 KK = 1 transaksi subsidi per minggu (Senin-Minggu WIB). KK wajib 16 digit angka. Mode bulk (satu KK semua barang) atau per barang (KK berbeda). Sistem menolak KK yang sudah dipakai minggu ini (termasuk race condition).
- OCR nota: scan foto struk, hasil ditambahkan ke form. Default provider OpenRouter (qwen/qwen3-vl-30b-a3b-instruct). Tombol "Tambahkan semua". Barang belum cocok dipilih manual. Nota yang barang, tanggal, jam, dan totalnya sama dengan nota tersimpan diberi tanda "Sudah diinput" dan dilewati saat Tambahkan semua. Overlay loading & toast error tersedia.
- Batalkan nota: dari detail nota, stok dikembalikan, status "DIBATALKAN".

## PRODUK
- Daftar & filter: perlu perhatian, belum ada foto, belum ada SKU, belum ada harga jual.
- Tambah produk: dari Stok → Terima barang, centang "Tambah barang baru" (tanggal/jam penerimaan & expired).
- Edit produk & foto: SKU, harga beli/jual, stok minimum, expired terdekat, unggah foto (bucket Storage "produk", publik, maks 5MB, dikompres otomatis).
- Tandai barang subsidi: centang "Barang subsidi" di edit produk. Auto-tanda untuk kata kunci: npk, urea, lpg, elpiji, gas 3, sphp, minyak kita, minyakita, pupuk.
- Input SO (stock opname): /produk/so. Pilih petugas (gondola/lokasi otomatis), gondola, tingkat (1-6), tanggal hitung, tambah baris barang + qty fisik. Selisih dihitung otomatis dari stok sistem toko.

## STOK
- Terima barang: /stok → Terima barang. Isi tanggal/jam penerimaan, expired, qty toko & gudang.
- Mutasi: pindah stok antara toko dan gudang (total tetap).
- Koreksi opname: sesuaikan stok dengan hasil hitung fisik (dengan alasan).
- Dokumentasi & STB: unggah foto dokumentasi penerimaan dan STB di menu Stok. Bucket Storage "stok" (privat, butuh login). Maks 5MB, dikompres.
- Stok menipis & expired: dashboard menampilkan produk dengan stok ≤ minimum atau expired dalam 60 hari. Filter "Perlu perhatian" di halaman Produk.

## RETUR
- Catat retur: /retur. Jenis: ke supplier, expired, rusak, dari pembeli. Stok diperbarui sesuai jenis.
- Jenis retur: ke supplier (stok berkurang), expired (stok berkurang), rusak (stok berkurang), dari pembeli (stok bertambah).

## LAPORAN HARIAN
- Keuangan: /laporan-harian/keuangan — laporan keuangan harian terpusat, bisa diekspor.
- Absensi: /laporan-harian/absensi — catat kehadiran petugas.
- Kebersihan: /laporan-harian/kebersihan — checklist kebersihan.
- SO harian & gondola: /laporan-harian/so, /so-gondola, /so-harian — rekap stock opname per petugas/gondola.
- Ringkasan: /laporan-harian/summary — ringkasan laporan harian.

## LAPORAN KARYAWAN
- Generate: /laporan-karyawan/generate — generate laporan karyawan (PDF).
- Riwayat & upload: /laporan-karyawan/riwayat, /upload — lihat riwayat dan upload dokumen.

## PENGATURAN
- OCR: /pengaturan — atur Base URL, API key, model, reasoning OCR nota. Default provider OpenRouter (qwen/qwen3-vl-30b-a3b-instruct). Model lain yang mendukung vision juga bisa dipakai.
- Tema: toggle di sidebar (desktop) atau header (mobile). Disimpan di localStorage (kdkmp-theme). Mode sistem mengikuti preferensi OS. Landing page juga ikut tema.
- Profil & akun: akun dibuat oleh administrator di Supabase Dashboard. Logout lewat sidebar bawah. Tidak ada pendaftaran publik.

## ATURAN SUBSIDI
- 1 KK = 1 transaksi subsidi per minggu (Senin-Minggu, WIB). Sistem menolak KK yang sudah dipakai minggu ini (termasuk race condition antar kasir).
- Barang subsidi: Pupuk NPK, Pupuk Urea, LPG, SPHP, Minyak Kita (auto-tanda berdasarkan nama).
- No. KK wajib 16 digit angka untuk barang subsidi.
- Mode bulk: satu KK untuk semua barang subsidi di nota.
- Mode per barang: KK berbeda untuk tiap barang subsidi.
- Cek & perbaikan: jalankan supabase/cek_subsidi.sql untuk memeriksa kandidat subsidi yang belum ditandai, duplikat produk, pelanggaran KK mingguan.
- Pengecekan mingguan: sistem otomatis mengecek pemakaian KK di tabel sales dan sale_kk untuk minggu berjalan (Senin 00:00 WIB s.d. Senin berikutnya).

## SHORTCUT & TIP
- Ctrl + ; : isi tanggal hari ini (di form stok)
- Ctrl + Shift + ; : isi jam sekarang (di form stok)
- Esc : tutup dialog/menu
- Tab : navigasi antar field form
- Tips: gunakan OCR untuk mempercepat input; tombol "Tambahkan semua" untuk menambah semua nota OCR sekaligus; filter "Perlu perhatian" untuk cek stok menipis & expired; mode per barang untuk nota dengan KK berbeda; toggle tema sesuai preferensi; cetak struk dari detail nota.

## FAQ & TROUBLESHOOT
- Statistik landing kosong? Jalankan supabase/landing_stats.sql di Supabase SQL Editor.
- Fitur subsidi tidak aktif? Jalankan supabase/subsidi.sql lalu subsidi_per_item.sql.
- Foto produk tidak muncul? Jalankan supabase/produk_foto.sql dan buat bucket "produk".
- Upload dokumen/STB gagal? Jalankan supabase/stok_dokumen.sql dan buat bucket "stok".
- OCR tidak jalan? Atur API key/base URL di Pengaturan; default OpenRouter.
- Stok tidak berkurang? Pastikan trigger stok aktif (jalankan migrasi).
- KK ditolak? Pastikan 16 digit angka dan belum dipakai minggu ini.
- Build gagal "no direct app page entry found": hapus folder .next, lalu npm run build.
- Redirect loop login: cek middleware; pastikan / publik dan /dashboard protected.
- Foto tidak muncul: cek bucket Storage & policy RLS.
- OCR timeout: naikkan timeout atau ganti model yang lebih cepat.
- Tema tidak berubah: clear localStorage kdkmp-theme lalu refresh.
- Kode error: 23505 (duplikat), PGRST202 (fungsi RPC tidak ditemukan), 401/403 (tidak terautentikasi/izin), 404 (resource tidak ditemukan).

## DATABASE & MIGRASI
Tabel: products (katalog), sales (nota), sale_items (baris nota), sale_kk (pemakaian KK), karyawan (petugas SO), product_gondola (pemetaan produk-gondola-tingkat), so_gondola (hasil SO), app_settings (pengaturan OCR).
Urutan migrasi: kdkmp_retail_simple.sql → seed.sql → dashboard.sql → subsidi.sql → subsidi_per_item.sql → produk_foto.sql → stok_dokumen.sql → landing_stats.sql → so_gondola.sql, product_gondola.sql, migration_tingkat_1_6.sql, seed_product_gondola.sql → ocr.sql, pengaturan.sql.
RLS: semua tabel operasional hanya bisa diakses pengguna terautentikasi. Bucket "produk" publik, bucket "stok" privat. Landing stats via RPC landing_stats (security definer) boleh diakses anon.
`.trim();
