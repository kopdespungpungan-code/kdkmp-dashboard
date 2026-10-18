import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, angka, rupiah, tglPanjang, tglPendek, tglTanggal, tglWaktu, todayWIB } from "@/lib/format";
import { statusStok } from "@/lib/stok";
import { Alert, Badge, Empty, PageHeader, Section } from "@/components/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OmzetChart from "@/components/OmzetChart";

export const dynamic = "force-dynamic";

type Harian = { tanggal: string; nota: number; pcs: number; omzet: number };
type Laris = { id: number; item: string; pcs: number; omzet: number };
type Perhatian = {
  id: number; sku: string | null; item: string; gramasi: string | null;
  stok_toko: number; stok_gudang: number; stok_total: number; stok_min: number | null; expired_terdekat: string | null;
};
type Ringkas = { jenis_produk: number; total_stok: number; menipis: number; habis: number; hampir_expired: number };
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
        <PageHeader title="Ringkasan" />
        <Alert>
          Data belum bisa dimuat: {err.message}. Pastikan file <code>supabase/dashboard.sql</code> sudah dijalankan di SQL Editor dan Anda sudah masuk.
        </Alert>
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
    .map((p) => ({ ...p, status: statusStok(p.stok_total, p.stok_min, p.expired_terdekat) }))
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
    <div className="space-y-6">
      <PageHeader title="Ringkasan" sub={tglPanjang(today)} />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <Card key={k.label}>
            <CardHeader>
              <CardTitle className="text-sm text-redup">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`font-display font-bold ${k.big ? "text-2xl text-merah" : "text-xl"}`}>{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Section title="Omzet 14 hari terakhir">
          <Card>
            <CardContent className="p-0">
              <div className="h-64 w-full p-4">
                <OmzetChart data={chart} />
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Terlaris 30 hari">
          <Card>
            <CardContent className="p-0">
              {(laris.data ?? []).length === 0 ? (
                <Empty>Belum ada penjualan.</Empty>
              ) : (
                <div className="divide-y divide-garis">
                  {(laris.data as Laris[]).slice(0, 8).map((p) => (
                    <div key={p.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                      <span className="min-w-0 truncate text-sm">{p.item}</span>
                      <span className="shrink-0 font-semibold text-sm">{angka(Number(p.pcs))} pcs</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Section>
      </div>

      <Section
        title="Perlu perhatian"
        action={
          <Link href="/produk?f=perhatian" className="text-sm font-semibold text-merah underline">
            Lihat semua ({urut.length})
          </Link>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <Badge tone="merah">{angka(Number(r.habis))} habis atau minus</Badge>
          <Badge tone="kuning">{angka(Number(r.menipis))} menipis</Badge>
          <Badge tone="kuning">{angka(Number(r.hampir_expired))} hampir expired</Badge>
          <span className="self-center text-redup">
            dari {angka(Number(r.jenis_produk))} produk, total {angka(Number(r.total_stok))} pcs
          </span>
        </div>
        {urut.length === 0 ? (
          <Empty>Semua stok aman.</Empty>
        ) : (
          <div className="space-y-3">
            {urut.slice(0, 10).map((p) => (
              <Card key={p.id}>
                <CardHeader className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <Link href={`/produk/${p.id}`} className="font-semibold hover:underline text-sm">
                        {p.item}
                      </Link>
                      {p.sku && <span className="text-xs text-redup">{p.sku}</span>}
                    </div>
                    <div className="flex gap-1">
                      {p.status.map((s) => (
                        <Badge key={s.label} tone={s.tone}>
                          {s.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-redup">Toko</div>
                      <div className="font-semibold">{angka(p.stok_toko)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-redup">Gudang</div>
                      <div className="font-semibold">{angka(p.stok_gudang)}</div>
                    </div>
                  </div>
                  {p.expired_terdekat && (
                    <div className="mt-3 text-xs text-redup">
                      Expired: {tglTanggal(p.expired_terdekat)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Nota terakhir" action={<Link href="/penjualan" className="text-sm font-semibold text-merah underline">Semua nota</Link>}>
        {(terakhir.data ?? []).length === 0 ? (
          <Empty>Belum ada nota. Buat nota pertama dari menu Penjualan.</Empty>
        ) : (
          <div className="space-y-3">
            {(terakhir.data as Invoice[]).map((n) => (
              <Card key={n.id}>
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/penjualan/${n.id}`} className="font-semibold hover:underline text-sm">
                        {n.invoice_no}
                      </Link>
                      <div className="text-xs text-redup">{tglWaktu(n.tanggal)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{rupiah(Number(n.total))}</div>
                      <div className="text-xs text-redup">{angka(Number(n.pcs))} pcs</div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
