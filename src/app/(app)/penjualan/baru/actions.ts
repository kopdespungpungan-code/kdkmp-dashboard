"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KK_PANJANG, kkValid, mingguBerjalan, rapikanKK } from "@/lib/subsidi";

type Line = { product_id: number; qty: number; harga: number; no_kk?: string };

const PESAN_MIGRASI_KK =
  "Fitur KK bulk/per barang belum aktif di database. Jalankan supabase/subsidi_per_item.sql di Supabase SQL Editor, lalu coba lagi.";

function pesanSkema(m: string): string {
  const s = m.toLowerCase();
  if (
    /(sale_kk|sale_items.*no_kk|no_kk.*sale_items|sales_subsidi_wajib_kk|sale_items_subsidi_wajib_kk)/i.test(s) &&
    /(column|schema cache|could not find|does not exist|constraint)/i.test(s)
  ) {
    return PESAN_MIGRASI_KK;
  }
  if (
    /no_kk|subsidi/i.test(s) &&
    /(column|schema cache|could not find|does not exist)/i.test(s)
  ) {
    return "Fitur subsidi belum aktif di database. Jalankan supabase/subsidi.sql di Supabase SQL Editor, lalu coba lagi.";
  }
  return m;
}

function saleKkMissing(m: string): boolean {
  const s = m.toLowerCase();
  return /sale_kk/.test(s) && /(does not exist|schema cache|could not find|relation)/.test(s);
}

function invoiceDariRelasi(rel: unknown): string | null {
  if (Array.isArray(rel)) {
    const first = rel[0] as { invoice_no?: string } | undefined;
    return first?.invoice_no ?? null;
  }
  return (rel as { invoice_no?: string } | null | undefined)?.invoice_no ?? null;
}

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
  if (new Set(lines.map((l) => l.product_id)).size !== lines.length) {
    bad("Ada barang yang sama lebih dari sekali di nota. Gabungkan qty-nya lalu coba lagi.");
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const kasir = user.email?.split("@")[0] ?? null;

  // Status subsidi ditentukan dari database, bukan dari data yang dikirim browser.
  const ids = [...new Set(lines.map((l) => l.product_id))];
  const { data: produkData, error: produkErr } = await sb
    .from("products")
    .select("id, item, subsidi")
    .in("id", ids);
  if (produkErr) bad(pesanSkema(produkErr.message));
  const produk = new Map((produkData ?? []).map((p) => [Number(p.id), p]));
  if (produk.size !== ids.length) bad("Ada barang yang sudah tidak tersedia. Muat ulang halaman lalu coba lagi.");

  const subsidiIds = new Set(ids.filter((id) => Boolean(produk.get(id)?.subsidi)));
  const adaSubsidi = subsidiIds.size > 0;

  const kkMode = String(formData.get("kk_mode") ?? "bulk");
  let noKkBulk: string | null = null;
  const kkItem = new Map<number, string>();

  if (adaSubsidi) {
    if (!["bulk", "per_item"].includes(kkMode)) bad("Cara input No. KK tidak valid.");
    if (kkMode === "bulk") {
      noKkBulk = rapikanKK(String(formData.get("no_kk") ?? ""));
      if (!kkValid(noKkBulk)) bad(`No. KK wajib diisi ${KK_PANJANG} digit angka untuk transaksi barang subsidi.`);
      for (const id of subsidiIds) kkItem.set(id, noKkBulk);
    } else {
      for (const id of subsidiIds) {
        const line = lines.find((l) => l.product_id === id);
        const kk = rapikanKK(String(line?.no_kk ?? ""));
        if (!kkValid(kk)) {
          const nama = produk.get(id)?.item ?? "barang subsidi";
          bad(`No. KK untuk ${nama} wajib diisi ${KK_PANJANG} digit angka.`);
        }
        kkItem.set(id, kk);
      }
    }
  }

  const kks = [...new Set(kkItem.values())];
  if (kks.length > 0) {
    const { mulai, selesai } = mingguBerjalan();
    const [salesCek, kkCek] = await Promise.all([
      sb
        .from("sales")
        .select("no_kk, invoice_no")
        .eq("subsidi", true)
        .in("no_kk", kks)
        .gte("tanggal", mulai)
        .lt("tanggal", selesai),
      sb
        .from("sale_kk")
        .select("no_kk, tanggal, sales(invoice_no)")
        .in("no_kk", kks)
        .gte("tanggal", mulai)
        .lt("tanggal", selesai),
    ]);

    if (salesCek.error) bad(pesanSkema(salesCek.error.message));
    if (kkCek.error) {
      if (saleKkMissing(kkCek.error.message)) bad(PESAN_MIGRASI_KK);
      bad(pesanSkema(kkCek.error.message));
    }

    const bentrokBulk = (salesCek.data ?? [])[0] as { no_kk: string; invoice_no: string } | undefined;
    if (bentrokBulk) {
      bad(`KK ${bentrokBulk.no_kk} sudah melakukan transaksi subsidi minggu ini (${bentrokBulk.invoice_no}). Batasnya 1x per minggu per KK.`);
    }

    const bentrokItem = ((kkCek.data ?? []) as unknown as {
      no_kk: string;
      sales?: { invoice_no?: string } | { invoice_no?: string }[] | null;
    }[])[0];
    if (bentrokItem) {
      const invoice = invoiceDariRelasi(bentrokItem.sales) ?? "-";
      bad(`KK ${bentrokItem.no_kk} sudah melakukan transaksi subsidi minggu ini (${invoice}). Batasnya 1x per minggu per KK.`);
    }
  }

  // nomor nota berikutnya: NOTA-000005 dst (coba ulang jika bentrok)
  let saleId: number | null = null;
  let saleTanggal: string | null = null;
  let lastError = "";
  for (let attempt = 0; attempt < 3 && saleId === null; attempt++) {
    const { data: last } = await sb.from("sales").select("invoice_no").order("invoice_no", { ascending: false }).limit(1).maybeSingle();
    const next = (parseInt((last?.invoice_no ?? "").replace(/\D/g, "")) || 0) + 1 + attempt;
    const { data, error } = await sb
      .from("sales")
      .insert({
        invoice_no: `NOTA-${String(next).padStart(6, "0")}`,
        kasir,
        no_kk: kkMode === "bulk" ? noKkBulk : null,
        subsidi: adaSubsidi,
      })
      .select("id, tanggal")
      .single();
    if (error) {
      lastError = pesanSkema(error.message);
      // Bentrok nomor nota -> coba nomor berikutnya. Bentrok KK subsidi -> hentikan.
      if (error.code === "23505" && /no_kk|subsidi|kk_minggu/i.test(error.message)) {
        bad("Salah satu No. KK sudah melakukan transaksi subsidi minggu ini. Batasnya 1x per minggu per KK.");
      }
      if (error.code !== "23505") break;
    } else {
      saleId = Number(data.id);
      saleTanggal = data.tanggal;
    }
  }
  if (saleId === null) bad(`Nota gagal dibuat: ${lastError}`);

  // Simpan pemakaian KK sebelum baris nota. Trigger stok berjalan saat
  // sale_items di-insert; kalau penyimpanan KK gagal setelah itu, stok sudah
  // terlanjur berkurang. Dengan urutan ini, kegagalan KK tidak menyentuh stok.
  if (kks.length > 0) {
    const { error: kkErr } = await sb.from("sale_kk").insert(
      kks.map((no_kk) => ({
        sale_id: saleId,
        no_kk,
        ...(saleTanggal ? { tanggal: saleTanggal } : {}),
      })),
    );
    if (kkErr) {
      await sb.from("sales").delete().eq("id", saleId);
      if (kkErr.code === "23505") {
        bad("Salah satu No. KK sudah melakukan transaksi subsidi minggu ini. Batasnya 1x per minggu per KK.");
      }
      bad(`No. KK gagal disimpan: ${pesanSkema(kkErr.message)}`);
    }
  }

  const itemRows = lines.map((l) => {
    const subsidi = subsidiIds.has(l.product_id);
    const row: Record<string, unknown> = {
      sale_id: saleId,
      product_id: l.product_id,
      qty_pcs: l.qty,
      harga: l.harga,
      subsidi,
    };
    // Semua baris memakai kunci yang sama saat nota mengandung subsidi
    // (baris non-subsidi diisi null). Nota tanpa subsidi tidak mengirim
    // kolom no_kk sama sekali, supaya tetap bisa disimpan sebelum migrasi.
    if (adaSubsidi) row.no_kk = subsidi ? (kkItem.get(l.product_id) ?? null) : null;
    return row;
  });

  const { error: itemErr } = await sb.from("sale_items").insert(itemRows);
  if (itemErr) {
    await sb.from("sales").delete().eq("id", saleId);
    bad(`Barang gagal disimpan: ${pesanSkema(itemErr.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/penjualan/${saleId}?ok=1`);
}
