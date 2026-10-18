import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { angka, rupiah, tglTanggal } from "@/lib/format";
import { statusStok } from "@/lib/stok";
import { Alert, Badge, Empty, PageHeader } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";
const PER = 40;

const filters = [
  { key: "", label: "Semua" },
  { key: "perhatian", label: "Perlu perhatian" },
  { key: "sku", label: "Belum ada SKU" },
  { key: "harga", label: "Belum ada harga jual" },
];

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string; p?: string }>;
}) {
  const { q = "", f = "", p = "1" } = await searchParams;
  const page = Math.max(1, parseInt(p) || 1);
  const sb = await createClient();

  let query = sb.from(f === "perhatian" ? "v_perlu_perhatian" : "products").select("*", { count: "exact" });
  if (f === "sku") query = query.is("sku", null);
  if (f === "harga") query = query.is("harga_jual", null);
  if (f !== "perhatian") query = query.eq("aktif", true);
  const term = q.replace(/[%,()]/g, " ").trim();
  if (term) query = query.or(`item.ilike.%${term}%,sku.ilike.%${term}%`);
  const { data, error, count } = await query.order("item").range((page - 1) * PER, page * PER - 1);

  const rows = (data ?? []) as (Product & { stok_total?: number })[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER));
  const href = (o: { f?: string; p?: number }) => {
    const sp = new URLSearchParams();
    const ff = o.f ?? f;
    if (q) sp.set("q", q);
    if (ff) sp.set("f", ff);
    if (o.p && o.p > 1) sp.set("p", String(o.p));
    const s = sp.toString();
    return `/produk${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Produk" sub={`${angka(total)} produk`} />
      {error && <Alert>{error.message}</Alert>}

      <form className="mb-3 flex flex-col sm:flex-row gap-2">
        <Input name="q" defaultValue={q} placeholder="Cari nama atau SKU" className="max-w-sm" aria-label="Cari produk" />
        {f && <input type="hidden" name="f" value={f} />}
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          Cari
        </Button>
      </form>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {filters.map((x) => (
          <Link
            key={x.key}
            href={href({ f: x.key })}
            aria-current={f === x.key ? "true" : undefined}
            className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
              f === x.key ? "border-ink bg-ink text-white" : "border-garis bg-white hover:border-ink"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>Tidak ada produk yang cocok.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const tot = r.stok_toko + r.stok_gudang;
            const st = statusStok(tot, r.stok_min, r.expired_terdekat);
            return (
              <Card key={r.id}>
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/produk/${r.id}`} className="font-semibold hover:underline text-sm truncate block">
                        {r.item}
                      </Link>
                      {r.supplier && <div className="text-xs text-redup truncate">{r.supplier}</div>}
                      {r.sku && <div className="text-xs text-redup">SKU: {r.sku}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {st.map((s) => (
                        <Badge key={s.label} tone={s.tone}>
                          {s.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-redup">Harga</div>
                      <div className="font-semibold text-xs">{rupiah(r.harga_jual)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-redup">Toko</div>
                      <div className="font-semibold">{angka(r.stok_toko)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-redup">Gudang</div>
                      <div className="font-semibold">{angka(r.stok_gudang)}</div>
                    </div>
                  </div>
                  {r.expired_terdekat && (
                    <div className="mt-2 text-xs text-redup">
                      Expired: {tglTanggal(r.expired_terdekat)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ p: page - 1 })}>Sebelumnya</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-redup">Halaman {page} dari {pages}</span>
          {page < pages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ p: page + 1 })}>Berikutnya</Link>
            </Button>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
