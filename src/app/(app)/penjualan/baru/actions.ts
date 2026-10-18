"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Line = { product_id: number; qty: number; harga: number };

export async function buatNota(formData: FormData) {
  function bad(m: string): never {
    redirect(`/penjualan/baru?error=${encodeURIComponent(m)}`);
  }

  let lines: Line[] = [];
  try {
    lines = JSON.parse(String(formData.get("payload") ?? "[]"));
  } catch {
    bad("Data nota tidak terbaca. Muat ulang halaman lalu coba lagi.");
  }
  if (!Array.isArray(lines) || lines.length === 0) bad("Tambahkan minimal satu barang.");
  for (const l of lines) {
    if (!Number.isInteger(l.product_id) || !Number.isInteger(l.qty) || l.qty <= 0) bad("Qty harus bilangan bulat lebih dari 0.");
    if (typeof l.harga !== "number" || !(l.harga >= 0)) bad("Harga tidak valid.");
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const kasir = user.email?.split("@")[0] ?? null;

  // nomor nota berikutnya: NOTA-000005 dst (coba ulang jika bentrok)
  let saleId: number | null = null;
  let lastError = "";
  for (let attempt = 0; attempt < 3 && saleId === null; attempt++) {
    const { data: last } = await sb.from("sales").select("invoice_no").order("invoice_no", { ascending: false }).limit(1).maybeSingle();
    const next = (parseInt((last?.invoice_no ?? "").replace(/\D/g, "")) || 0) + 1 + attempt;
    const { data, error } = await sb
      .from("sales")
      .insert({ invoice_no: `NOTA-${String(next).padStart(6, "0")}`, kasir })
      .select("id")
      .single();
    if (error) lastError = error.message;
    else saleId = data.id;
  }
  if (saleId === null) bad(`Nota gagal dibuat: ${lastError}`);

  const { error: itemErr } = await sb
    .from("sale_items")
    .insert(lines.map((l) => ({ sale_id: saleId, product_id: l.product_id, qty_pcs: l.qty, harga: l.harga })));
  if (itemErr) {
    await sb.from("sales").delete().eq("id", saleId);
    bad(`Barang gagal disimpan: ${itemErr.message}`);
  }

  revalidatePath("/", "layout");
  redirect(`/penjualan/${saleId}?ok=1`);
}
