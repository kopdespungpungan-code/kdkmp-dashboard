"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cariPetugas } from "@/lib/petugas";

export type ItemSo = {
  produk_id: number;
  qty_fisik: number;
  stok_sistem: number;
  expired?: string | null;
  rusak_exp?: number;
  keterangan?: string | null;
};

export type SimpanSoInput = {
  tanggal: string;
  petugas: string;
  gondola_no: number | null;
  gondola_lokasi: string;
  tingkat: number;
  items: ItemSo[];
};

export type SimpanSoResult =
  | { ok: true; jumlah: number; peringatan?: string }
  | { ok: false; error: string };

/**
 * Simpan hasil SO per petugas. Insert/update satu baris per produk
 * (kunci: tanggal + petugas + gondola/lokasi + tingkat + produk).
 */
export async function simpanSo(input: SimpanSoInput): Promise<SimpanSoResult> {
  const info = cariPetugas(input.petugas);
  if (!info) return { ok: false, error: "Petugas tidak dikenal." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggal)) return { ok: false, error: "Tanggal tidak valid." };
  if (!Number.isInteger(input.tingkat) || input.tingkat < 1) return { ok: false, error: "Tingkat tidak valid." };

  const pakaiGondola = info.gondolas.length > 0;
  const gondola_no = pakaiGondola ? input.gondola_no : null;
  const gondola_lokasi = pakaiGondola ? "" : input.gondola_lokasi;

  if (pakaiGondola) {
    if (!gondola_no || !Number.isInteger(gondola_no)) return { ok: false, error: "Pilih gondola terlebih dahulu." };
    if (!info.gondolas.includes(gondola_no)) return { ok: false, error: "Gondola tidak termasuk wilayah petugas ini." };
  } else {
    if (!gondola_lokasi) return { ok: false, error: "Pilih lokasi terlebih dahulu." };
    if (!info.lokasi.includes(gondola_lokasi)) return { ok: false, error: "Lokasi tidak termasuk wilayah petugas ini." };
  }

  const items = (input.items ?? []).filter((it) => Number.isInteger(it.produk_id) && it.produk_id > 0);
  if (items.length === 0) return { ok: false, error: "Belum ada barang yang diisi." };
  for (const it of items) {
    if (!Number.isFinite(it.qty_fisik) || it.qty_fisik < 0 || !Number.isInteger(it.qty_fisik)) {
      return { ok: false, error: "Qty fisik harus bilangan bulat nol atau lebih." };
    }
  }

  // Cegah barang duplikat dalam satu kiriman
  const ids = items.map((it) => it.produk_id);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Ada barang yang tercatat dua kali." };

  const sb = await createClient();

  // Database lama belum punya kolom `keterangan`/`gondola_key`; catatan hanya
  // disimpan bila kolomnya memang ada, dan upsert dilakukan manual per id.
  const { error: errKeterangan } = await sb.from("so_gondola").select("keterangan").limit(1);
  const adaKeterangan = !errKeterangan;

  const { data: lama, error: errLama } = await sb
    .from("so_gondola")
    .select("id, produk_id, gondola_no, gondola_lokasi, tingkat")
    .eq("tanggal", input.tanggal)
    .eq("petugas", info.label);
  if (errLama) return { ok: false, error: errLama.message };

  const kunciBaris = (produk_id: number, g: number | null, l: string, t: number) =>
    [produk_id, g ?? "", l ?? "", t].join("|");

  const idLama = new Map<string, number>();
  for (const r of lama ?? []) {
    idLama.set(
      kunciBaris(
        Number(r.produk_id),
        r.gondola_no === null ? null : Number(r.gondola_no),
        r.gondola_lokasi ?? "",
        Number(r.tingkat),
      ),
      Number(r.id),
    );
  }

  const baru: Record<string, unknown>[] = [];
  const perbarui: { id: number; isi: Record<string, unknown> }[] = [];

  for (const it of items) {
    const isi: Record<string, unknown> = {
      tanggal: input.tanggal,
      petugas: info.label,
      gondola_no,
      gondola_lokasi,
      tingkat: input.tingkat,
      produk_id: it.produk_id,
      qty_fisik: it.qty_fisik,
      stok_sistem: Number.isFinite(it.stok_sistem) ? it.stok_sistem : 0,
      expired: it.expired?.trim() || null,
      rusak_exp: Number.isFinite(it.rusak_exp as number) ? Number(it.rusak_exp) : 0,
    };
    if (adaKeterangan) isi.keterangan = it.keterangan?.trim() || null;

    const id = idLama.get(kunciBaris(it.produk_id, gondola_no, gondola_lokasi, input.tingkat));
    if (id) perbarui.push({ id, isi });
    else baru.push(isi);
  }

  if (baru.length > 0) {
    const { error } = await sb.from("so_gondola").insert(baru);
    if (error) return { ok: false, error: error.message };
  }

  for (const { id, isi } of perbarui) {
    const { error } = await sb.from("so_gondola").update(isi).eq("id", id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/produk/so");
  revalidatePath("/laporan-harian/so-gondola");
  revalidatePath("/laporan-harian/harian");
  const adaCatatan = items.some((it) => (it.keterangan ?? "").trim() !== "");
  return {
    ok: true,
    jumlah: items.length,
    peringatan:
      adaCatatan && !adaKeterangan
        ? "Keterangan belum tersimpan karena kolom keterangan belum ada di database. Jalankan supabase/migration_so_gondola_kolom.sql."
        : undefined,
  };
}
