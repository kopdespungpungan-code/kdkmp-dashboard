import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { angka, rupiah, tglWaktu } from "@/lib/format";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import HapusNota from "./HapusNota";

export const dynamic = "force-dynamic";

// searchParams ditambah error

type Item = { id: number; qty_pcs: number; harga: number; keterangan: string | null; products: { item: string } | null };

export default async function DetailNota({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const sid = Number(id);
  if (!Number.isInteger(sid)) notFound();

  

  const sb = await createClient();
  const [{ data: sale }, { data: items }] = await Promise.all([
    sb.from("sales").select("id, invoice_no, tanggal, kasir").eq("id", sid).maybeSingle(),
    sb.from("sale_items").select("id, qty_pcs, harga, keterangan, products(item)").eq("sale_id", sid).order("id"),
  ]);
  if (!sale) notFound();
  const rows = (items ?? []) as unknown as Item[];
  const total = rows.reduce((a, r) => a + r.qty_pcs * Number(r.harga), 0);

  return (
    <>
<PageHeader
  title={sale.invoice_no}
  sub={`${tglWaktu(sale.tanggal)}${sale.kasir ? `, kasir ${sale.kasir}` : ""}`}
  action={
    <div className="flex items-center gap-2">
      <LinkButton href="/penjualan">Semua nota</LinkButton>
      <HapusNota id={sale.id} invoiceNo={sale.invoice_no} />
    </div>
  }
/>
      {ok && <div role="status" className="mb-4 rounded border border-hijau/40 bg-hijau-muda px-3 py-2 text-sm text-hijau">Nota tersimpan dan stok toko sudah dikurangi.</div>}
      {rows.length === 0 && <Alert>Nota ini tidak punya barang.</Alert>}
      <div className="max-w-3xl space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-sm">{r.products?.item ?? "-"}</div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm">{rupiah(r.qty_pcs * Number(r.harga))}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-redup">{angka(r.qty_pcs)} pcs × {rupiah(Number(r.harga))}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-display text-xl font-bold text-merah">{rupiah(total)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
