"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TIPE = ["SUPPLIER", "CUSTOMER", "RUSAK", "EXPIRED"];

export async function buatRetur(formData: FormData) {
  function bad(m: string): never {
    redirect(`/retur?error=${encodeURIComponent(m)}`);
  }
  const product_id = Number(formData.get("product_id"));
  const qty_pcs = Number(formData.get("qty_pcs"));
  const tipe = String(formData.get("tipe") ?? "");
  const tanggal = String(formData.get("tanggal") ?? "");
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;

  if (!Number.isInteger(product_id) || product_id <= 0) bad("Pilih barang dari daftar yang muncul.");
  if (!Number.isInteger(qty_pcs) || qty_pcs <= 0) bad("Qty harus bilangan bulat lebih dari 0.");
  if (!TIPE.includes(tipe)) bad("Jenis retur tidak valid.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) bad("Tanggal tidak valid.");

  const sb = await createClient();
  const { error } = await sb.from("returns").insert({ product_id, qty_pcs, tipe, tanggal, keterangan });
  if (error) bad(error.message);

  revalidatePath("/", "layout");
  redirect("/retur?ok=1");
}
