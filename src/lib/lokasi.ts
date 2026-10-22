// Menampilkan lokasi fisik sebuah produk: di gondola mana (beserta tingkat),
// atau "Gudang" bila produk belum ditempatkan di gondola/lokasi mana pun.

export type PetaLokasi = {
  gondola_no: number | null;
  /** Nama lokasi untuk petugas yang tidak memakai nomor gondola (mis. Lia). */
  lokasi: string;
  tingkat: number | null;
};

/** Satu lokasi, mis. "Gondola 5 · T2" atau "DEPAN KASIR · T1". */
export function labelLokasi(p: PetaLokasi): string {
  const wilayah = p.gondola_no !== null ? `Gondola ${p.gondola_no}` : p.lokasi || "Gudang";
  return p.tingkat === null ? wilayah : `${wilayah} · T${p.tingkat}`;
}

/**
 * Ringkasan lokasi untuk daftar produk. Produk bisa berada di beberapa
 * gondola sekaligus; yang ditampilkan dua teratas lalu jumlah sisanya.
 * Tanpa pemetaan sama sekali berarti barangnya masih di gudang.
 */
export function ringkasLokasi(list: PetaLokasi[]): string {
  if (list.length === 0) return "Gudang";
  const label = list.map(labelLokasi);
  if (label.length <= 2) return label.join(", ");
  return `${label.slice(0, 2).join(", ")} +${label.length - 2}`;
}

/** True bila produk belum ditempatkan di gondola/lokasi mana pun. */
export function hanyaDiGudang(list: PetaLokasi[]): boolean {
  return list.length === 0;
}
