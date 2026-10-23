/**
 * Aturan transaksi barang subsidi.
 * Satu KK hanya boleh 1 transaksi subsidi per minggu (Senin–Minggu, WIB).
 */
export const KK_PANJANG = 16;

export const ATURAN_SUBSIDI =
  "1 KK hanya boleh 1 transaksi subsidi per minggu (Senin–Minggu, WIB).";

export const CONTOH_BARANG_SUBSIDI = [
  "Pupuk NPK",
  "Pupuk Urea",
  "LPG",
  "SPHP",
  "Minyak Kita",
];

/**
 * Kata kunci yang sama dengan auto-tanda di supabase/subsidi.sql.
 * Dipakai untuk memperingatkan produk yang mungkin subsidi tetapi belum
 * dicentang. Flag produk tetap menjadi penentu utama saat transaksi.
 */
export const KATA_KUNCI_SUBSIDI = [
  "npk",
  "urea",
  "lpg",
  "elpiji",
  "gas 3",
  "sphp",
  "minyak kita",
  "minyakita",
] as const;

export function namaBarangSubsidi(item: string): boolean {
  const nama = item.toLowerCase();
  return KATA_KUNCI_SUBSIDI.some((k) => nama.includes(k));
}

/** Ambil hanya angka dan batasi 16 digit. */
export function rapikanKK(v: string): string {
  return v.replace(/\D/g, "").slice(0, KK_PANJANG);
}

export function kkValid(v: string): boolean {
  return new RegExp(`^[0-9]{${KK_PANJANG}}$`).test(v);
}

/** Tampilkan 4 digit terakhir saja, mis. "•••• 1234". */
export function samarkanKK(v: string | null | undefined): string {
  if (!v) return "-";
  return `•••• ${v.slice(-4)}`;
}

/**
 * Rentang minggu berjalan menurut WIB (Senin 00:00 s.d. Senin berikutnya).
 * Nilai dikembalikan dalam ISO UTC agar bisa dipakai query timestamptz.
 */
export function mingguBerjalan(now: Date = new Date()): { mulai: string; selesai: string } {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);

  // getUTCDay(): 0 = Minggu. Hitung mundur ke hari Senin.
  const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const sejakSenin = (hari + 6) % 7;

  // 00:00 WIB = 17:00 UTC hari sebelumnya.
  const mulai = new Date(Date.UTC(y, m - 1, d - sejakSenin, -7));
  const selesai = new Date(mulai.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { mulai: mulai.toISOString(), selesai: selesai.toISOString() };
}
