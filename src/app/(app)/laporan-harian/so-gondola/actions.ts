"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cariPetugas } from "@/lib/petugas";

export type ItemSoGondola = {
  produk_id: number;
  qty_fisik: number;
  stok_sistem: number;
  expired?: string | null;
  /** Gondola & tingkat per baris, diambil otomatis dari pemetaan produk. */
  gondola_no: number | null;
  gondola_lokasi: string;
  tingkat: number;
};

export type SimpanTingkatInput = {
  petugas: string;
  items: { pemetaan_id: number; tingkat: number | null }[];
};

export type SimpanTingkatResult = { ok: true; jumlah: number } | { ok: false; error: string };

/**
 * Simpan perubahan tingkat rak ke tabel pemetaan product_gondola.
 *
 * Inilah jalur "sinkron ke DB": kalau tingkat hasil hitung fisik berbeda dari
 * data Excel, koreksinya ikut tersimpan sehingga SO berikutnya memakai
 * pemetaan yang sudah benar. Tingkat null berarti raknya dikosongkan.
 */
export async function simpanTingkatProduk(input: SimpanTingkatInput): Promise<SimpanTingkatResult> {
  const info = cariPetugas(input.petugas);
  if (!info) return { ok: false, error: "Petugas tidak dikenal." };

  const items = (input.items ?? []).filter((it) => Number.isInteger(it.pemetaan_id) && it.pemetaan_id > 0);
  if (items.length === 0) return { ok: true, jumlah: 0 };

  for (const it of items) {
    if (it.tingkat !== null && (!Number.isInteger(it.tingkat) || it.tingkat < 1 || it.tingkat > 6)) {
      return { ok: false, error: "Tingkat harus 1-6 atau dikosongkan." };
    }
  }

  const sb = await createClient();

  // Pastikan baris pemetaan memang ada dan wilayahnya milik petugas ini,
  // supaya perubahan tidak bisa menyasar gondola orang lain.
  const ids = items.map((it) => it.pemetaan_id);
  const { data: ada, error: errCek } = await sb
    .from("product_gondola")
    .select("id, produk_id, gondola_no, lokasi, tingkat")
    .in("id", ids);
  if (errCek) return { ok: false, error: errCek.message };
  if (!ada || ada.length !== ids.length) {
    return { ok: false, error: "Sebagian data pemetaan tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  }

  const pakaiGondola = info.gondolas.length > 0;
  for (const baris of ada) {
    const cocok = pakaiGondola
      ? baris.gondola_no !== null && info.gondolas.includes(baris.gondola_no)
      : baris.gondola_no === null && info.lokasi.includes(baris.lokasi);
    if (!cocok) {
      return { ok: false, error: "Ada barang yang bukan wilayah petugas ini." };
    }
  }

  // Satu per satu supaya pesan bentroknya jelas (mis. produk sudah ada di
  // tingkat tujuan pada gondola yang sama).
  let jumlah = 0;
  for (const it of items) {
    const { error } = await sb
      .from("product_gondola")
      .update({ tingkat: it.tingkat, updated_at: new Date().toISOString() })
      .eq("id", it.pemetaan_id);
    if (error) {
      if (/duplicate key|unique/i.test(error.message)) {
        return {
          ok: false,
          error: "Tingkat bentrok: barang ini sudah terdaftar di tingkat tersebut pada gondola yang sama.",
        };
      }
      return { ok: false, error: error.message };
    }
    jumlah += 1;
  }

  revalidatePath("/laporan-harian/so-gondola");
  revalidatePath("/produk/so");
  return { ok: true, jumlah };
}

export type TambahProdukInput = {
  petugas: string;
  produk_id: number;
  gondola_no: number | null;
  gondola_lokasi: string;
  tingkat: number;
};

export type TambahProdukResult =
  | { ok: true; item: string }
  | { ok: false; error: string };

/**
 * Tempatkan satu produk ke gondola/lokasi + tingkat tertentu.
 * Dipakai tombol "Tambah produk" pada tingkat yang masih kosong.
 */
export async function tambahProdukGondola(input: TambahProdukInput): Promise<TambahProdukResult> {
  const info = cariPetugas(input.petugas);
  if (!info) return { ok: false, error: "Petugas tidak dikenal." };

  if (!Number.isInteger(input.produk_id) || input.produk_id <= 0) {
    return { ok: false, error: "Pilih produk dulu." };
  }
  if (!Number.isInteger(input.tingkat) || input.tingkat < 1 || input.tingkat > 6) {
    return { ok: false, error: "Tingkat harus 1-6." };
  }

  const pakaiGondola = info.gondolas.length > 0;
  if (pakaiGondola) {
    if (input.gondola_no === null || !info.gondolas.includes(input.gondola_no)) {
      return { ok: false, error: "Gondola bukan wilayah petugas ini." };
    }
  } else {
    if (!input.gondola_lokasi || !info.lokasi.includes(input.gondola_lokasi)) {
      return { ok: false, error: "Lokasi bukan wilayah petugas ini." };
    }
  }

  const sb = await createClient();

  const { data: produk, error: errProduk } = await sb
    .from("products")
    .select("id, item")
    .eq("id", input.produk_id)
    .maybeSingle();
  if (errProduk) return { ok: false, error: errProduk.message };
  if (!produk) return { ok: false, error: "Produk tidak ditemukan." };

  const { error } = await sb.from("product_gondola").insert({
    produk_id: input.produk_id,
    gondola_no: pakaiGondola ? input.gondola_no : null,
    lokasi: pakaiGondola ? "" : input.gondola_lokasi,
    tingkat: input.tingkat,
  });

  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      return { ok: false, error: `"${produk.item}" sudah ada di gondola/tingkat ini.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/laporan-harian/so-gondola");
  revalidatePath("/produk");
  return { ok: true, item: produk.item };
}

export type SimpanSoGondolaInput = {
  tanggal: string;
  petugas: string;
  catatan?: string | null;
  items: ItemSoGondola[];
};

export type SimpanSoGondolaResult =
  | { ok: true; jumlah: number; peringatan?: string }
  | { ok: false; error: string };

/**
 * Simpan hasil SO Gondola. Upsert satu baris per produk
 * (kunci: tanggal + petugas + gondola/lokasi + tingkat + produk).
 *
 * Gondola dan tingkat diambil dari tiap item, bukan dari satu pilihan global,
 * supaya satu kali simpan bisa memuat beberapa gondola/tingkat sekaligus.
 */
export async function simpanSoGondola(input: SimpanSoGondolaInput): Promise<SimpanSoGondolaResult> {
  const info = cariPetugas(input.petugas);
  if (!info) return { ok: false, error: "Petugas tidak dikenal." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggal)) return { ok: false, error: "Tanggal tidak valid." };

  const pakaiGondola = info.gondolas.length > 0;

  const items = (input.items ?? []).filter((it) => Number.isInteger(it.produk_id) && it.produk_id > 0);
  if (items.length === 0) return { ok: false, error: "Belum ada Qty Fisik yang diisi." };

  // Validasi tiap baris: wilayahnya harus termasuk tanggung jawab petugas ini.
  for (const it of items) {
    if (!Number.isInteger(it.qty_fisik) || it.qty_fisik < 0) {
      return { ok: false, error: "Qty fisik harus bilangan bulat nol atau lebih." };
    }
    if (!Number.isInteger(it.tingkat) || it.tingkat < 1) {
      return { ok: false, error: "Tingkat barang tidak valid." };
    }
    if (pakaiGondola) {
      if (it.gondola_no === null || !Number.isInteger(it.gondola_no)) {
        return { ok: false, error: "Ada barang yang belum punya nomor gondola." };
      }
      if (!info.gondolas.includes(it.gondola_no)) {
        return { ok: false, error: `Gondola ${it.gondola_no} bukan wilayah ${info.label}.` };
      }
    } else {
      if (!it.gondola_lokasi) return { ok: false, error: "Ada barang yang belum punya lokasi." };
      if (!info.lokasi.includes(it.gondola_lokasi)) {
        return { ok: false, error: `Lokasi "${it.gondola_lokasi}" bukan wilayah ${info.label}.` };
      }
    }
  }

  // Kunci upsert menyertakan gondola & tingkat, jadi produk yang sama di
  // gondola/tingkat berbeda tetap tersimpan sebagai baris terpisah.
  const kunci = items.map((it) =>
    [it.produk_id, it.gondola_no ?? "", it.gondola_lokasi, it.tingkat].join("|"),
  );
  if (new Set(kunci).size !== kunci.length) {
    return { ok: false, error: "Ada barang yang tercatat dua kali di gondola/tingkat yang sama." };
  }

  const sb = await createClient();

  // Sebagian database dibuat dari versi skema lama yang belum punya kolom
  // `keterangan` dan `gondola_key`. Jangan sampai penyimpanan ikut gagal
  // hanya karena catatan; kolom opsional dipakai kalau memang ada.
  const { error: errKeterangan } = await sb.from("so_gondola").select("keterangan").limit(1);
  const adaKeterangan = !errKeterangan;
  const catatan = input.catatan?.trim() || null;

  const dasar = (it: ItemSoGondola) => ({
    tanggal: input.tanggal,
    petugas: info.label,
    gondola_no: pakaiGondola ? it.gondola_no : null,
    gondola_lokasi: pakaiGondola ? "" : it.gondola_lokasi,
    tingkat: it.tingkat,
    produk_id: it.produk_id,
    qty_fisik: it.qty_fisik,
    stok_sistem: Number.isFinite(it.stok_sistem) ? it.stok_sistem : 0,
    expired: it.expired?.trim() || null,
  });

  // Tanpa kolom generated `gondola_key` kita tidak bisa memakai ON CONFLICT,
  // jadi baris yang sudah ada dicari dulu lalu diperbarui per id.
  const { data: lama, error: errLama } = await sb
    .from("so_gondola")
    .select("id, produk_id, gondola_no, gondola_lokasi, tingkat")
    .eq("tanggal", input.tanggal)
    .eq("petugas", info.label);
  if (errLama) return { ok: false, error: errLama.message };

  const kunciBaris = (r: {
    produk_id: number;
    gondola_no: number | null;
    gondola_lokasi: string;
    tingkat: number;
  }) => [r.produk_id, r.gondola_no ?? "", r.gondola_lokasi ?? "", r.tingkat].join("|");

  const idLama = new Map<string, number>();
  for (const r of lama ?? []) {
    idLama.set(
      kunciBaris({
        produk_id: Number(r.produk_id),
        gondola_no: r.gondola_no === null ? null : Number(r.gondola_no),
        gondola_lokasi: r.gondola_lokasi ?? "",
        tingkat: Number(r.tingkat),
      }),
      Number(r.id),
    );
  }

  const baru: Record<string, unknown>[] = [];
  const perbarui: { id: number; isi: Record<string, unknown> }[] = [];

  items.forEach((it, i) => {
    const isi: Record<string, unknown> = dasar(it);
    if (adaKeterangan) isi.keterangan = catatan;

    const id = idLama.get(kunci[i]);
    if (id) perbarui.push({ id, isi });
    else baru.push(isi);
  });

  if (baru.length > 0) {
    const { error } = await sb.from("so_gondola").insert(baru);
    if (error) return { ok: false, error: error.message };
  }

  for (const { id, isi } of perbarui) {
    const { error } = await sb.from("so_gondola").update(isi).eq("id", id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/laporan-harian/so-gondola");
  revalidatePath("/produk/so");
  revalidatePath("/laporan-harian/harian");
  return {
    ok: true,
    jumlah: items.length,
    peringatan:
      catatan && !adaKeterangan
        ? "Catatan belum tersimpan karena kolom keterangan belum ada di database. Jalankan supabase/migration_so_gondola_kolom.sql."
        : undefined,
  };
}
