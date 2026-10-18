"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function catatStok(formData: FormData) {
  function bad(m: string): never {
    redirect(`/stok?error=${encodeURIComponent(m)}`);
  }
  const product_id = Number(formData.get("product_id"));
  const jenis = String(formData.get("jenis") ?? "");
  const qty = Number(formData.get("qty"));
  const lokasi = String(formData.get("lokasi") ?? "GUDANG"); // TERIMA & OPNAME: GUDANG | TOKO
  const arah = String(formData.get("arah") ?? "GUDANG_TOKO"); // MUTASI
  const expired = String(formData.get("expired") ?? "").trim() || null;
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;

  if (!Number.isInteger(product_id) || product_id <= 0) bad("Pilih barang dari daftar yang muncul.");
  if (!["TERIMA", "MUTASI", "OPNAME"].includes(jenis)) bad("Jenis catatan tidak valid.");
  if (!Number.isInteger(qty) || qty < 0 || (jenis !== "OPNAME" && qty === 0)) bad("Qty harus bilangan bulat yang valid.");
  if (expired && !/^\d{4}-\d{2}-\d{2}$/.test(expired)) bad("Tanggal expired tidak valid.");

  const sb = await createClient();
  let delta_toko = 0;
  let delta_gudang = 0;

  if (jenis === "TERIMA") {
    if (lokasi === "TOKO") delta_toko = qty;
    else delta_gudang = qty;
  } else if (jenis === "MUTASI") {
    if (arah === "TOKO_GUDANG") {
      delta_toko = -qty;
      delta_gudang = qty;
    } else {
      delta_gudang = -qty;
      delta_toko = qty;
    }
  } else {
    const { data: p } = await sb.from("products").select("stok_toko, stok_gudang").eq("id", product_id).maybeSingle();
    if (!p) bad("Barang tidak ditemukan.");
    const sekarang = lokasi === "TOKO" ? p.stok_toko : p.stok_gudang;
    const selisih = qty - sekarang;
    if (selisih === 0) bad(`Stok ${lokasi === "TOKO" ? "toko" : "gudang"} sudah ${sekarang}, tidak ada selisih.`);
    if (lokasi === "TOKO") delta_toko = selisih;
    else delta_gudang = selisih;
  }

  const { error } = await sb.from("stock_log").insert({
    product_id,
    jenis,
    delta_toko,
    delta_gudang,
    expired: jenis === "TERIMA" ? expired : null,
    keterangan,
  });
  if (error) bad(error.message);

  revalidatePath("/", "layout");
  redirect("/stok?ok=1");
}
