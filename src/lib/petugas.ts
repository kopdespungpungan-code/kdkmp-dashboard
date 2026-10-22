// Petugas SO dan wilayah gondola/lokasi, mengikuti sheet Excel
// "DATABASE POS KDKMP PUNGPUNGAN.xlsx" (VYRDA/PANDU/RISTA/DEDIK/IMEL/LIA).

export type PetugasInfo = {
  key: string;
  label: string;
  /** Nomor gondola yang jadi tanggung jawab petugas (kosong bila memakai lokasi). */
  gondolas: number[];
  /** Nama lokasi (dipakai petugas yang tidak memakai nomor gondola, mis. Lia). */
  lokasi: string[];
};

export const PETUGAS: PetugasInfo[] = [
  { key: "VYRDA", label: "Vyrda Ayu Lestari", gondolas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lokasi: [] },
  { key: "PANDU", label: "Pandu", gondolas: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], lokasi: [] },
  { key: "RISTA", label: "Rista", gondolas: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36], lokasi: [] },
  { key: "DEDIK", label: "Dedik", gondolas: [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48], lokasi: [] },
  { key: "IMEL", label: "Imel", gondolas: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60], lokasi: [] },
  {
    key: "LIA",
    label: "Lia Agustina",
    gondolas: [],
    lokasi: [
      "DEPAN KASIR",
      "GONDOLA BELAKANG UTARA",
      "GONDOLA BELAKANG TENGAH",
      "GONDOLA BELAKANG SELATAN",
      "GONDOLA DEPAN UTARA",
      "GONDOLA DEPAN TENGAH",
      "GONDOLA DEPAN SELATAN",
    ],
  },
];

/** Tingkat rak yang dipakai di seluruh aplikasi (1-6). */
export const TINGKAT = [1, 2, 3, 4, 5, 6];

export function cariPetugas(key: string): PetugasInfo | undefined {
  return PETUGAS.find((p) => p.key === key);
}

/** Label wilayah untuk satu pilihan gondola/lokasi. */
export function labelWilayah(info: PetugasInfo, nilai: string): string {
  if (info.gondolas.length > 0) return `Gondola ${nilai}`;
  return nilai;
}
