"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pathDokumenValid } from "@/lib/stok-dokumen";
import { namaBarangSubsidi } from "@/lib/subsidi";

const teks = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

const angkaOpsional = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

/** Ubah nilai datetime-local (WIB) menjadi ISO untuk kolom timestamptz. */
function tanggalISO(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(?:\.\d{1,3})?)?$/.test(v)) return null;
  const lengkap = v.length === 16 ? `${v}:00` : v;
  const d = new Date(`${lengkap}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function catatStok(formData: FormData) {
  function bad(m: string): never {
    redirect(`/stok?error=${encodeURIComponent(m)}`);
  }

  const jenis = String(formData.get("jenis") ?? "");
  const qty = Number(formData.get("qty"));
  const lokasi = String(formData.get("lokasi") ?? "GUDANG"); // TERIMA & OPNAME: GUDANG | TOKO
  const arah = String(formData.get("arah") ?? "GUDANG_TOKO"); // MUTASI
  const expired = String(formData.get("expired") ?? "").trim() || null;
  const keterangan = String(formData.get("keterangan") ?? "").trim() || null;
  const dokumentasi_path =
    String(formData.get("dokumentasi_path") ?? "").trim() || null;
  const stb_path = String(formData.get("stb_path") ?? "").trim() || null;
  const barangBaru = formData.get("barang_baru") === "1";
  const tanggalInput = String(formData.get("tanggal") ?? "").trim();
  const tanggal = tanggalISO(tanggalInput);

  if (!["TERIMA", "MUTASI", "OPNAME"].includes(jenis)) bad("Jenis catatan tidak valid.");
  if (!Number.isInteger(qty) || qty < 0 || (jenis !== "OPNAME" && qty === 0)) bad("Qty harus bilangan bulat yang valid.");
  if (!["GUDANG", "TOKO"].includes(lokasi)) bad("Lokasi tidak valid.");
  if (!["GUDANG_TOKO", "TOKO_GUDANG"].includes(arah)) bad("Arah mutasi tidak valid.");
  if (!tanggal) bad("Tanggal dan jam wajib diisi dengan benar.");
  if (expired && !/^\d{4}-\d{2}-\d{2}$/.test(expired)) bad("Tanggal expired tidak valid.");
  if (dokumentasi_path && !pathDokumenValid(dokumentasi_path, "dokumentasi")) {
    bad("File dokumentasi tidak valid. Unggah ulang.");
  }
  if (stb_path && !pathDokumenValid(stb_path, "stb")) {
    bad("File STB tidak valid. Unggah ulang.");
  }
  if (barangBaru && jenis !== "TERIMA") {
    bad("Barang baru hanya bisa ditambahkan lewat catatan terima barang.");
  }

  let product_id = Number(formData.get("product_id"));
  if (!barangBaru && (!Number.isInteger(product_id) || product_id <= 0)) {
    bad("Pilih barang dari daftar yang muncul.");
  }

  // Data barang baru divalidasi sebelum barang dibuat, supaya tidak ada
  // produk setengah jadi saat qty atau tanggal belum benar.
  let namaBarang: string | null = null;
  let skuBaru: string | null = null;
  let gramasiBaru: string | null = null;
  let supplierBaru: string | null = null;
  let pcsBaru = 1;
  let hargaBeliBaru: number | null = null;
  let hargaJualBaru: number | null = null;
  let stokMinBaru = 0;
  let subsidiBaru = false;

  if (barangBaru) {
    namaBarang = teks(formData.get("nama_barang"));
    skuBaru = teks(formData.get("sku_baru"));
    gramasiBaru = teks(formData.get("gramasi_baru"));
    supplierBaru = teks(formData.get("supplier_baru"));
    subsidiBaru = formData.get("subsidi_baru") === "1";

    if (!namaBarang) bad("Nama barang baru wajib diisi.");
    // Barang dengan nama yang jelas subsidi tetap ditandai otomatis,
    // meskipun checkbox lupa dicentang.
    subsidiBaru = subsidiBaru || namaBarangSubsidi(namaBarang);

    const pcs = angkaOpsional(formData.get("pcs_per_karton_baru"));
    if (pcs !== null && (!Number.isInteger(pcs) || pcs < 1)) {
      bad("Isi per karton harus bilangan bulat 1 atau lebih.");
    }
    if (pcs !== null) pcsBaru = pcs;

    const beli = angkaOpsional(formData.get("harga_beli_baru"));
    const jual = angkaOpsional(formData.get("harga_jual_baru"));
    const stokMin = angkaOpsional(formData.get("stok_min_baru"));
    if (beli !== null && (Number.isNaN(beli) || beli < 0)) bad("Harga beli harus angka 0 atau lebih.");
    if (jual !== null && (Number.isNaN(jual) || jual < 0)) bad("Harga jual harus angka 0 atau lebih.");
    if (stokMin !== null && (!Number.isInteger(stokMin) || stokMin < 0)) {
      bad("Batas stok menipis harus bilangan bulat 0 atau lebih.");
    }
    if (beli !== null) hargaBeliBaru = beli;
    if (jual !== null) hargaJualBaru = jual;
    if (stokMin !== null) stokMinBaru = stokMin;
  }

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

  let produkBaruId: number | null = null;

  if (barangBaru) {
    const payloadProduk: Record<string, unknown> = {
      sku: skuBaru,
      item: namaBarang,
      gramasi: gramasiBaru,
      supplier: supplierBaru,
      pcs_per_karton: pcsBaru,
      harga_beli: hargaBeliBaru,
      harga_jual: hargaJualBaru,
      stok_toko: 0,
      stok_gudang: 0,
      stok_min: stokMinBaru,
      aktif: true,
    };
    // Hanya kirim kolom subsidi jika dicentang, supaya penambahan barang
    // tetap jalan sebelum migrasi subsidi.sql dijalankan.
    if (subsidiBaru) payloadProduk.subsidi = true;

    const { data: baru, error: eBaru } = await sb
      .from("products")
      .insert(payloadProduk)
      .select("id")
      .single();

    if (eBaru) {
      const pesan = eBaru.message.toLowerCase();
      if (eBaru.code === "23505") {
        if (pesan.includes("sku")) bad("SKU sudah dipakai produk lain. Gunakan SKU berbeda atau kosongkan.");
        bad("Nama barang sudah ada di database. Pilih barang itu dari daftar, atau gunakan nama berbeda.");
      }
      if (/subsidi/i.test(pesan) && /(column|schema|does not exist)/i.test(pesan)) {
        bad("Kolom subsidi belum ada. Jalankan supabase/subsidi.sql di Supabase SQL Editor.");
      }
      if (eBaru.code === "23502" && pesan.includes("sku")) {
        bad("Database ini mewajibkan SKU. Isi SKU barang baru, lalu simpan lagi.");
      }
      bad(eBaru.message);
    }
    if (!baru) bad("Gagal membuat barang baru.");

    produkBaruId = Number(baru.id);
    product_id = produkBaruId;
  }

  // Jangan sertakan kolom dokumen kalau kosong, supaya pencatatan stok tetap
  // bisa dipakai sebelum migrasi stok_dokumen.sql dijalankan.
  const payload: Record<string, unknown> = {
    product_id,
    jenis,
    tanggal,
    delta_toko,
    delta_gudang,
    expired: jenis === "TERIMA" ? expired : null,
    keterangan,
  };
  if (dokumentasi_path) payload.dokumentasi_path = dokumentasi_path;
  if (stb_path) payload.stb_path = stb_path;

  const { error } = await sb.from("stock_log").insert(payload);
  if (error) {
    // Jangan tinggalkan produk baru tanpa catatan stok saat insert gagal.
    if (produkBaruId) await sb.from("products").delete().eq("id", produkBaruId);
    if (
      /dokumentasi_path|stb_path/i.test(error.message) &&
      /(column|does not exist|schema)/i.test(error.message)
    ) {
      bad("Kolom dokumen stok belum ada. Jalankan supabase/stok_dokumen.sql di Supabase SQL Editor.");
    }
    bad(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/stok?ok=1");
}
