import { createClient } from "@/lib/supabase/server";
import { angka, rupiah, todayWIB } from "@/lib/format";
import HarianClient from "./HarianClient";

export const dynamic = "force-dynamic";

export default async function HarianPage() {
  const sb = await createClient();
  const today = todayWIB();

  const [penjualan, stokRingkas, stokDetail, terlaris, perhatian, soGondola] = await Promise.all([
    sb.from("v_omzet_harian").select("*").eq("tanggal", today).maybeSingle(),
    sb.from("v_ringkasan_stok").select("*").single(),
    sb.from("products").select("id, sku, item, gramasi, stok_toko, stok_gudang, expired_terdekat, stok_min").eq("aktif", true).order("item"),
    sb.from("v_terlaris_30hari").select("*"),
    sb.from("v_perlu_perhatian").select("*").limit(500),
    sb.from("v_so_gondola_summary").select("*").eq("tanggal", today),
  ]);

  const h = penjualan.data;
  const r = stokRingkas.data;
  const products = stokDetail.data ?? [];
  const laris = terlaris.data ?? [];
  const perhatianList = perhatian.data ?? [];
  const soGondolaList = soGondola.data ?? [];

  const rows = products.map((p) => ({
    id: p.id,
    sku: p.sku ?? "-",
    item: p.item,
    gramasi: p.gramasi ?? "-",
    stok_toko: Number(p.stok_toko ?? 0),
    stok_gudang: Number(p.stok_gudang ?? 0),
    expired_terdekat: p.expired_terdekat ?? null,
    stok_min: p.stok_min ?? null,
    stok_real: "",
  }));

  const urut = perhatianList
    .map((p) => ({ ...p }))
    .sort((a, b) => {
      const pa = a.stok_total <= 0 ? 0 : 1;
      const pb = b.stok_total <= 0 ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.expired_terdekat ?? "9999").localeCompare(b.expired_terdekat ?? "9999");
    });

  return (
    <HarianClient
      today={today}
      penjualan={h}
      ringkasan={r}
      rows={rows}
      terlaris={laris}
      perhatian={urut}
      soGondola={soGondolaList}
      nomorLaporan={"LH/" + today.split("-").join("")}
    />
  );
}
