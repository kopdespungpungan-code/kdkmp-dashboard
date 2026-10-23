export type OcrItem = { nama: string; qty: number; harga: number };
export type OcrNota = {
  invoice_no: string | null;
  tanggal: string | null;
  /** Jam pada nota, format "HH:MM" (boleh ada detik dari model). */
  jam: string | null;
  kasir: string | null;
  items: OcrItem[];
  total: number | null;
};

/** Ambil "HH:MM" dari teks jam apa pun (mis. "14:52:33", "14.52"). */
export function jamPendek(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = String(v).match(/(\d{1,2})[:.](\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/** Ambil "YYYY-MM-DD" walau model mengembalikan tanggal + jam. */
export function tanggalPendek(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = String(v).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * Kunci isi nota untuk mendeteksi nota yang sama: tanggal + jam + total +
 * daftar barang (nama, qty, harga). Dipakai untuk membuang halaman ganda
 * saat OCR dan untuk mencocokkan dengan nota yang sudah tersimpan.
 */
export function kunciIsiNota(n: OcrNota): string | null {
  const tanggal = tanggalPendek(n.tanggal);
  if (!tanggal) return null;
  const items = (Array.isArray(n.items) ? n.items : [])
    .map(
      (it) =>
        `${norm(String(it?.nama ?? "")).join(" ")}:${Math.max(1, Math.floor(Number(it?.qty) || 1))}:${Math.round(
          Number(it?.harga) || 0
        )}`
    )
    .sort()
    .join("|");
  const jam = jamPendek(n.jam) ?? "";
  const total = Math.round(Number(n.total ?? 0));
  return `${tanggal}#${jam}#${total}#${items}`;
}

const KEY = "ocr_nota";

// Baca hasil OCR; buang halaman tanpa barang (mis. halaman rekap)
export function loadOcrNotas(): OcrNota[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const j = JSON.parse(raw);
    return (Array.isArray(j) ? j : [j]).filter(
      (n) => Array.isArray(n?.items) && n.items.length > 0
    );
  } catch {
    return [];
  }
}

export function saveOcrNotas(list: OcrNota[]) {
  sessionStorage.setItem(KEY, JSON.stringify(list));
}

export function clearOcrNotas() {
  sessionStorage.removeItem(KEY);
}

const token = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

// Cocokkan nama barang hasil OCR ke daftar produk (kemiripan kata)
const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

// Kata nama saja (buang kode kemasan seperti 8GBX20PCX12.5G, 190, 650ML)
function kataNama(s: string): string[] {
  const all = norm(s);
  const huruf = all.filter((w) => /^[a-z]{3,}$/.test(w));
  return huruf.length ? huruf : all;
}

function lev1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

function samaKata(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  return a.length >= 5 && b.length >= 5 && lev1(a, b);
}

// Cocokkan nama barang hasil OCR ke daftar produk
export function matchProduk<T>(
  nama: string,
  produk: T[],
  getName: (p: T) => string,
  minScore = 0.4
): T | null {
  const a = kataNama(nama);
  if (a.length === 0) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const p of produk) {
    const b = kataNama(getName(p));
    if (b.length === 0) continue;
    const hitA = a.filter((x) => b.some((y) => samaKata(x, y))).length;
    const hitB = b.filter((y) => a.some((x) => samaKata(x, y))).length;
    const c1 = hitA / a.length; // berapa kata OCR ditemukan di produk
    const c2 = hitB / b.length; // berapa kata produk ada di OCR
    const score = c1 + c2 === 0 ? 0 : (2 * c1 * c2) / (c1 + c2);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore >= minScore ? best : null;
}