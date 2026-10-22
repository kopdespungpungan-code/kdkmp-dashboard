import { createClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/format";
import { Alert } from "@/components/ui";
import SoGondolaClient, { type StockRow, type ProdukOpsi } from "./SoGondolaClient";

export const dynamic = "force-dynamic";

export default async function SoGondolaPage() {
  const sb = await createClient();
  const today = todayWIB();

  // Barang per gondola/lokasi + tingkat, mengikuti pemetaan product_gondola.
  // `id` = id baris pemetaan, dipakai untuk memperbarui tingkat dengan tepat.
  const { data: products, error: errProduk } = await sb
    .from("v_product_gondola")
    .select("id, produk_id, sku, item, gramasi, stok_toko, stok_gudang, expired_terdekat, stok_min, gondola_no, gondola_lokasi, tingkat")
    .order("item");

  // SO terakhir per gondola/lokasi (untuk jadwal 3 hari)
  const { data: lastSo, error: errLastSo } = await sb
    .from("v_so_gondola_terakhir")
    .select("*");

  // Kumpulkan masalah, tapi JANGAN matikan halaman: pemilihan petugas memakai
  // data statis (src/lib/petugas.ts), jadi tidak butuh database sama sekali.
  const masalah: string[] = [];
  if (errProduk) {
    const belumAda =
      errProduk.code === "PGRST205" ||
      /v_product_gondola|product_gondola|does not exist|schema cache/i.test(errProduk.message);
    masalah.push(
      belumAda
        ? "Pemetaan produk→gondola belum siap. Jalankan supabase/product_gondola.sql lalu supabase/seed_product_gondola.sql, kemudian restart dev server."
        : `Gagal memuat daftar barang: ${errProduk.message}`,
    );
    if (!belumAda && /invalid api key|401|JWT/i.test(errProduk.message)) {
      masalah.push(
        "Key Supabase di .env.local sepertinya tidak cocok dengan project di NEXT_PUBLIC_SUPABASE_URL. Ambil anon key yang benar dari Supabase → Settings → API.",
      );
    }
  }
  if (errLastSo) masalah.push(`Gagal memuat jadwal SO: ${errLastSo.message}`);

  const rows: StockRow[] = (products ?? []).map((p) => ({
    pemetaan_id: Number(p.id),
    id: Number(p.produk_id),
    sku: p.sku ?? "-",
    item: p.item,
    gramasi: p.gramasi ?? "-",
    stok_toko: Number(p.stok_toko ?? 0),
    stok_gudang: Number(p.stok_gudang ?? 0),
    expired_terdekat: p.expired_terdekat ?? null,
    stok_min: p.stok_min ?? null,
    gondola_no: p.gondola_no ?? null,
    gondola_lokasi: p.gondola_lokasi ?? "",
    tingkat: p.tingkat === null || p.tingkat === undefined ? null : Number(p.tingkat),
    qty_fisik: "",
  }));

  // Daftar produk aktif untuk fitur "Tambah produk" pada tingkat kosong.
  const { data: produkAktif } = await sb
    .from("products")
    .select("id, item, sku, gramasi")
    .eq("aktif", true)
    .order("item")
    .limit(5000);

  const produkOpsi: ProdukOpsi[] = (produkAktif ?? []).map((p) => ({
    id: Number(p.id),
    item: p.item,
    sku: p.sku ?? "",
    gramasi: p.gramasi ?? "",
  }));

  return (
    <>
      {masalah.length > 0 && (
        <Alert tone="merah">
          <div className="space-y-1">
            <strong>Sebagian data SO Gondola belum bisa dimuat.</strong>
            {masalah.map((m) => (
              <p key={m} className="text-sm">{m}</p>
            ))}
          </div>
        </Alert>
      )}
      <SoGondolaClient today={today} rows={rows} lastSo={lastSo ?? []} produkOpsi={produkOpsi} />
    </>
  );
}
