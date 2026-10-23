import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { angka, rupiah, tglWaktu } from "@/lib/format";
import { Alert, Badge, LinkButton, PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import HapusNota from "./HapusNota";

export const dynamic = "force-dynamic";

type Item = {
  id: number;
  qty_pcs: number;
  harga: number;
  keterangan: string | null;
  subsidi: boolean;
  no_kk: string | null;
  products: { item: string } | null;
};
type Sale = { id: number; invoice_no: string; tanggal: string; kasir: string | null; no_kk: string | null; subsidi: boolean };

export default async function DetailNota({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  const sid = Number(id);
  if (!Number.isInteger(sid)) notFound();

  

  const sb = await createClient();
  const { data: saleBaru } = await sb
    .from("sales")
    .select("id, invoice_no, tanggal, kasir, no_kk, subsidi")
    .eq("id", sid)
    .maybeSingle();
  let sale = saleBaru as Sale | null;
  if (!sale) {
    // Cadangan untuk database yang belum menjalankan supabase/subsidi.sql.
    const { data: saleLama } = await sb.from("sales").select("id, invoice_no, tanggal, kasir").eq("id", sid).maybeSingle();
    if (!saleLama) notFound();
    sale = { ...saleLama, no_kk: null, subsidi: false };
  }

  const { data: itemsBaru } = await sb
    .from("sale_items")
    .select("id, qty_pcs, harga, keterangan, subsidi, no_kk, products(item)")
    .eq("sale_id", sid)
    .order("id");
  let items = itemsBaru as unknown as Item[] | null;
  if (!items) {
    // Database sudah punya kolom subsidi tetapi belum menjalankan
    // supabase/subsidi_per_item.sql (kolom no_kk belum ada).
    const { data: itemsTanpaKk } = await sb
      .from("sale_items")
      .select("id, qty_pcs, harga, keterangan, subsidi, products(item)")
      .eq("sale_id", sid)
      .order("id");
    if (itemsTanpaKk) {
      items = (itemsTanpaKk as unknown as Omit<Item, "no_kk">[]).map((r) => ({ ...r, no_kk: null }));
    } else {
      const { data: itemsLama } = await sb
        .from("sale_items")
        .select("id, qty_pcs, harga, keterangan, products(item)")
        .eq("sale_id", sid)
        .order("id");
      items = ((itemsLama ?? []) as unknown as Omit<Item, "subsidi" | "no_kk">[]).map((r) => ({
        ...r,
        subsidi: false,
        no_kk: null,
      }));
    }
  }

  if (!sale) notFound();
  const rows = items ?? [];
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
      {sale.subsidi && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-primary/40 bg-accent px-3 py-2 text-sm">
          <Badge className="border-primary bg-primary text-primary-foreground">Subsidi</Badge>
          <span>
            No. KK:{" "}
            <span className="font-semibold">
              {sale.no_kk ?? "diisi per barang (lihat rincian)"}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">1 KK maksimal 1 transaksi subsidi per minggu.</span>
        </div>
      )}
      {rows.length === 0 && <Alert>Nota ini tidak punya barang.</Alert>}
      <div className="max-w-3xl space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 font-semibold text-sm">
                  <span>{r.products?.item ?? "-"}</span>
                  {r.subsidi && <Badge tone="merah">Subsidi</Badge>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm">{rupiah(r.qty_pcs * Number(r.harga))}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-redup">{angka(r.qty_pcs)} pcs × {rupiah(Number(r.harga))}</span>
              </div>
              {r.subsidi && (
                <p className="mt-1 text-xs text-redup">
                  No. KK: <span className="font-semibold text-ink">{r.no_kk ?? sale.no_kk ?? "-"}</span>
                </p>
              )}
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
