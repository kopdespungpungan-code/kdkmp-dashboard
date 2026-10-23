import { createClient } from "@/lib/supabase/server";
import { addDays, angka, rupiah, tglPanjang, tglPendek, todayWIB } from "@/lib/format";
import RingkasanClient from "./RingkasanClient";

export const dynamic = "force-dynamic";

type Ringkas = { jenis_produk: number; total_stok: number; menipis: number; habis: number; hampir_expired: number };

type Harian = { tanggal: string; nota: number; pcs: number; omzet: number };
type Laris = { id: number; item: string; pcs: number; omzet: number };
type Perhatian = {
  id: number; sku: string | null; item: string; gramasi: string | null;
  stok_toko: number; stok_gudang: number; stok_total: number; stok_min: number | null; expired_terdekat: string | null;
};
type Invoice = { id: number; invoice_no: string; tanggal: string; kasir: string | null; pcs: number; total: number };

export default async function Ringkasan() {
  const sb = await createClient();
  const today = todayWIB();
  const start = addDays(today, -13);

  const [ring, harian, laris, perhatian, terakhir] = await Promise.all([
    sb.from("v_ringkasan_stok").select("*").single(),
    sb.from("v_omzet_harian").select("*").gte("tanggal", start).order("tanggal"),
    sb.from("v_terlaris_30hari").select("*"),
    sb.from("v_perlu_perhatian").select("*").limit(500),
    sb.from("v_total_invoice").select("*").order("tanggal", { ascending: false }).limit(5),
  ]);

  const err = ring.error || harian.error || laris.error || perhatian.error || terakhir.error;
  if (err) {
    return (
      <>
        <div className="space-y-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
            <h1 className="text-2xl font-bold sm:text-3xl font-display">Ringkasan</h1>
          </div>
          <div role="alert" className="mb-4 rounded border border-merah/40 bg-merah-muda px-3 py-2 text-sm text-merah-tua">
            Data belum bisa dimuat: {err.message}. Pastikan file <code>supabase/dashboard.sql</code> sudah dijalankan di SQL Editor dan Anda sudah masuk.
          </div>
        </div>
      </>
    );
  }

  const r = ring.data as Ringkas;
  const rows = (harian.data ?? []) as Harian[];
  const byDay = new Map(rows.map((x) => [x.tanggal, x]));
  const chart = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(start, i);
    return { label: tglPendek(d), omzet: Number(byDay.get(d)?.omzet ?? 0), hariIni: d === today };
  });
  const hari = byDay.get(today);
  const omzet14 = chart.reduce((a, b) => a + b.omzet, 0);

  const urut = ((perhatian.data ?? []) as Perhatian[])
    .map((p) => ({ ...p }))
    .sort((a, b) => {
      const pa = a.stok_total <= 0 ? 0 : 1;
      const pb = b.stok_total <= 0 ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.expired_terdekat ?? "9999").localeCompare(b.expired_terdekat ?? "9999");
    });

  const kpi = [
    { label: "Omzet hari ini", value: rupiah(Number(hari?.omzet ?? 0)), big: true },
    { label: "Nota hari ini", value: angka(Number(hari?.nota ?? 0)) },
    { label: "Barang terjual hari ini", value: `${angka(Number(hari?.pcs ?? 0))} pcs` },
    { label: "Omzet 14 hari", value: rupiah(omzet14) },
  ];

  return (
    <RingkasanClient
      today={today}
      r={r}
      chart={chart}
      hari={hari}
      omzet14={omzet14}
      urut={urut}
      kpi={kpi}
      laris={(laris.data ?? []) as Laris[]}
      terakhir={(terakhir.data ?? []) as Invoice[]}
    />
  );
}
