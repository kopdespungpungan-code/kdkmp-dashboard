"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const text = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export async function updateProduk(id: number, formData: FormData) {
  const item = text(formData.get("item"));
  const harga_beli = num(formData.get("harga_beli"));
  const harga_jual = num(formData.get("harga_jual"));
  const stok_min = num(formData.get("stok_min"));
  const pcs_per_karton = num(formData.get("pcs_per_karton"));
  function bad(m: string): never {
    redirect(`/produk/${id}?error=${encodeURIComponent(m)}`);
  }

  if (!item) bad("Nama barang wajib diisi.");
  for (const n of [harga_beli, harga_jual, stok_min, pcs_per_karton]) {
    if (n !== null && (Number.isNaN(n) || n < 0)) bad("Harga dan angka stok harus berupa angka 0 atau lebih.");
  }

  const sb = await createClient();
  const { error } = await sb
    .from("products")
    .update({
      sku: text(formData.get("sku")),
      item,
      gramasi: text(formData.get("gramasi")),
      supplier: text(formData.get("supplier")),
      harga_beli,
      harga_jual,
      stok_min,
      pcs_per_karton: pcs_per_karton ?? 1,
      aktif: formData.get("aktif") === "on",
      subsidi: formData.get("subsidi") === "on",
    })
    .eq("id", id);

  if (error) {
    const pesan =
      /subsidi/i.test(error.message) && /(column|schema cache|could not find|does not exist)/i.test(error.message)
        ? "Kolom subsidi belum ada. Jalankan supabase/subsidi.sql di Supabase SQL Editor."
        : error.code === "23505"
          ? "SKU atau nama sudah dipakai produk lain."
          : error.message;
    bad(pesan);
  }
  revalidatePath("/produk");
  redirect("/produk?f=");
}
