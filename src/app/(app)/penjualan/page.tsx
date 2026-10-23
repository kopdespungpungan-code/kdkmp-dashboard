import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { angka, rupiah, tglWaktu } from "@/lib/format";
import { samarkanKK } from "@/lib/subsidi";
import { Alert, Badge, Empty, LinkButton, PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import UploadOcr from "@/components/Upload-OCR";

export const dynamic = "force-dynamic";

type Invoice = { id: number; invoice_no: string; tanggal: string; kasir: string | null; pcs: number; total: number; subsidi?: boolean; no_kk?: string | null };

export default async function PenjualanPage() {
  const sb = await createClient();
  const { data, error } = await sb.from("v_total_invoice").select("*").order("tanggal", { ascending: false }).limit(100);
  const rows = (data ?? []) as Invoice[];

  return (
    <>
      <PageHeader title="Penjualan" sub="100 nota terakhir" action={<div className="flex items-center gap-2">
      <UploadOcr />
      <LinkButton href="/penjualan/baru" primary>Buat nota</LinkButton>
    </div>} />
      {error && <Alert>{error.message}</Alert>}
      {rows.length === 0 ? (
        <Empty>Belum ada nota. Pilih Buat nota untuk mencatat penjualan pertama.</Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Card key={n.id}>
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/penjualan/${n.id}`} className="font-semibold hover:underline text-sm">
                      {n.invoice_no}
                    </Link>
                    <div className="text-xs text-redup">{tglWaktu(n.tanggal)}</div>
                    {n.kasir && <div className="text-xs text-redup">{n.kasir}</div>}
                    {n.subsidi && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone="merah">Subsidi</Badge>
                        <span className="text-xs text-redup">
                          {n.no_kk ? `KK ${samarkanKK(n.no_kk)}` : "KK per barang"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">{rupiah(Number(n.total))}</div>
                    <div className="text-xs text-redup">{angka(Number(n.pcs))} pcs</div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
