import { createClient } from "@/lib/supabase/server";
import { angka, tglWaktu, tglTanggal } from "@/lib/format";
import { Alert, Badge, Empty, PageHeader, Section } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ProductOpt } from "@/lib/types";
import StokForm from "./StokForm";

export const dynamic = "force-dynamic";

type Row = { id: number; tanggal: string; jenis: string; delta_toko: number; delta_gudang: number; expired: string | null; keterangan: string | null; products: { item: string } | null };
const label: Record<string, string> = { TERIMA: "Terima", MUTASI: "Pindah", OPNAME: "Opname" };
const sign = (n: number) => (n > 0 ? `+${angka(n)}` : angka(n));

export default async function StokPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const sb = await createClient();
  const [{ data: prod }, { data: log, error: e2 }] = await Promise.all([
    sb.from("products").select("id, item").eq("aktif", true).order("item").limit(5000),
    sb.from("stock_log").select("id, tanggal, jenis, delta_toko, delta_gudang, expired, keterangan, products(item)").order("id", { ascending: false }).limit(50),
  ]);
  const rows = (log ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Stok" sub="Terima barang, pindah gudang ke toko, dan koreksi hasil opname." />
      {error && <Alert>{error}</Alert>}
      {e2 && <Alert>{e2.message}</Alert>}
      {ok && <div role="status" className="mb-4 rounded border border-hijau/40 bg-hijau-muda px-3 py-2 text-sm text-hijau">Catatan stok tersimpan.</div>}

      <Section title="Catat stok">
        <StokForm products={(prod ?? []) as ProductOpt[]} />
      </Section>

      <Section title="Riwayat stok">
        {rows.length === 0 ? (
          <Empty>Belum ada catatan stok.</Empty>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{r.products?.item ?? "-"}</div>
                      <div className="text-xs text-redup">{tglWaktu(r.tanggal)}</div>
                    </div>
                    <Badge tone="abu">{label[r.jenis] ?? r.jenis}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-redup">Toko</div>
                      <div className="font-semibold">{r.delta_toko ? sign(r.delta_toko) : "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-redup">Gudang</div>
                      <div className="font-semibold">{r.delta_gudang ? sign(r.delta_gudang) : "-"}</div>
                    </div>
                    {r.expired && (
                      <div>
                        <div className="text-xs text-redup">Expired</div>
                        <div className="font-semibold text-xs">{tglTanggal(r.expired)}</div>
                      </div>
                    )}
                    {r.keterangan && (
                      <div className="col-span-2 sm:col-span-4">
                        <div className="text-xs text-redup">Keterangan</div>
                        <div className="text-sm">{r.keterangan}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
