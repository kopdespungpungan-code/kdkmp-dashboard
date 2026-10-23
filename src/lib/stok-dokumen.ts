export type JenisDokumenStok = "dokumentasi" | "stb";

export const BUCKET_STOK = "stok";
export const MAKS_UKURAN_DOKUMEN = 4 * 1024 * 1024; // aman untuk limit body Vercel 4,5 MB
export const TIPE_DOKUMEN: Record<JenisDokumenStok, readonly string[]> = {
  dokumentasi: ["image/jpeg", "image/png", "image/webp"],
  stb: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
};

export function tipeDokumenValid(jenis: JenisDokumenStok, tipe: string): boolean {
  return TIPE_DOKUMEN[jenis].includes(tipe);
}

export function ekstensiDokumen(tipe: string): string {
  if (tipe === "application/pdf") return "pdf";
  if (tipe === "image/png") return "png";
  if (tipe === "image/webp") return "webp";
  return "jpg";
}

/**
 * Path disimpan relatif terhadap bucket `stok`, contoh:
 *   dokumentasi/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jpg
 *   stb/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.pdf
 */
export function pathDokumenValid(
  path: string | null | undefined,
  jenis: JenisDokumenStok,
): boolean {
  if (!path) return false;
  return new RegExp(`^${jenis}/[A-Za-z0-9-]+\\.(jpg|jpeg|png|webp|pdf)$`).test(path);
}
