import { createClient } from "@/lib/supabase/server";
import { angka, tglTanggal, todayWIB } from "@/lib/format";
import { Alert, Badge, Empty, PageHeader, Section } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ProductOpt } from "@/lib/types";
import type { Tone } from "@/lib/stok";
import ReturForm from "./ReturForm";

export const dynamic = "force-dynamic";

type Row = { id: number; tanggal: string; qty_pcs: number; tipe: string; keterangan: string | null; products: { item: string } | null };
const tipeInfo: Record<string, { label: string; tone: Tone }> = {
  SUPPLIER: { label: "Ke supplier", tone: "abu" },
  EXPIRED: { label: "Expired", tone: "kuning" },
  RUSAK: { label: "Rusak", tone: "merah" },
  CUSTOMER: { label: "Dari pembeli", tone: "hijau" },
};

export default async function ReturPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const sb = await createClient();
  const [{ data: prod }, { data: ret, error: e2 }] = await Promise.all([
    sb.from("products").select("id, item").eq("aktif", true).order("item").limit(5000),
    sb.from("returns").select("id, tanggal, qty_pcs, tipe, keterangan, products(item)").order("tanggal", { ascending: false }).order("id", { ascending: false }).limit(100),
  ]);
  const rows = (ret ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Retur" sub="Stok toko ikut berubah otomatis setelah retur disimpan." />
      {error && <Alert>{error}</Alert>}
      {e2 && <Alert>{e2.message}</Alert>}
      {ok && <div role="status" className="mb-4 rounded border border-hijau/40 bg-hijau-muda px-3 py-2 text-sm text-hijau">Retur tersimpan dan stok toko sudah disesuaikan.</div>}

      <Section title="Catat retur">
        <ReturForm products={(prod ?? []) as ProductOpt[]} today={todayWIB()} />
      </Section>

      <Section title="Riwayat retur">
        {rows.length === 0 ? (
          <Empty>Belum ada retur.</Empty>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const t = tipeInfo[r.tipe] ?? { label: r.tipe, tone: "abu" as Tone };
              return (
                <Card key={r.id}>
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{r.products?.item ?? "-"}</div>
                        <div className="text-xs text-redup">{tglTanggal(r.tanggal)}</div>
                      </div>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-redup">Qty</span>
                      <span className="font-semibold">{angka(r.qty_pcs)} pcs</span>
                    </div>
                    {r.keterangan && (
                      <div className="mt-2 text-xs text-redup">{r.keterangan}</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}
