import { createClient } from "@/lib/supabase/server";
import { angka, nowWIBInput, tglWaktu, tglTanggal } from "@/lib/format";
import { Alert, Badge, Empty, PageHeader, Section } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProductPhoto } from "@/components/ProductPhoto";
import type { ProductOpt } from "@/lib/types";
import { BUCKET_STOK } from "@/lib/stok-dokumen";
import StokForm from "./StokForm";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  tanggal: string;
  jenis: string;
  delta_toko: number;
  delta_gudang: number;
  expired: string | null;
  keterangan: string | null;
  dokumentasi_path?: string | null;
  stb_path?: string | null;
  products: { item: string } | null;
};
const label: Record<string, string> = { TERIMA: "Terima", MUTASI: "Pindah", OPNAME: "Opname" };
const sign = (n: number) => (n > 0 ? `+${angka(n)}` : angka(n));

export default async function StokPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const sb = await createClient();
  const [{ data: prod }, { data: log, error: e2 }] = await Promise.all([
    sb.from("products").select("*").eq("aktif", true).order("item").limit(5000),
    sb.from("stock_log").select("*, products(item)").order("id", { ascending: false }).limit(10),
  ]);
  const rows = (log ?? []) as unknown as Row[];

  // Buat signed URL sekali untuk semua dokumen di halaman ini.
  const paths = [
    ...new Set(
      rows
        .flatMap((r) => [r.dokumentasi_path, r.stb_path])
        .filter((p): p is string => Boolean(p)),
    ),
  ];
  const tautan = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await sb.storage
      .from(BUCKET_STOK)
      .createSignedUrls(paths, 60 * 60 * 24);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) tautan.set(item.path, item.signedUrl);
    }
  }
  const gagalTautan = paths.length > 0 && tautan.size === 0;

  return (
    <>
      <PageHeader title="Stok" sub="Terima barang, pindah gudang ke toko, koreksi opname, dan simpan dokumentasi/STB." />
      {error && <Alert>{error}</Alert>}
      {e2 && <Alert>{e2.message}</Alert>}
      {gagalTautan && (
        <Alert tone="kuning">
          Dokumen stok tersimpan, tetapi tautannya gagal dibuat. Pastikan bucket{" "}
          <strong>stok</strong> dan policy dari <code>supabase/stok_dokumen.sql</code>{" "}
          sudah dijalankan.
        </Alert>
      )}
      {ok && <div role="status" className="mb-4 rounded border border-hijau/40 bg-hijau-muda px-3 py-2 text-sm text-hijau">Catatan stok tersimpan.</div>}

      <Section title="Catat stok">
        <StokForm products={(prod ?? []) as ProductOpt[]} defaultTanggal={nowWIBInput()} />
      </Section>

      <Section title="Riwayat stok">
        {rows.length === 0 ? (
          <Empty>Belum ada catatan stok.</Empty>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const dokUrl = r.dokumentasi_path ? tautan.get(r.dokumentasi_path) : null;
              const stbUrl = r.stb_path ? tautan.get(r.stb_path) : null;

              return (
                <Card key={r.id}>
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{r.products?.item ?? "-"}</div>
                        <div className="text-xs text-redup">
                          {r.jenis === "TERIMA" ? "Diterima" : "Dicatat"} {tglWaktu(r.tanggal)}
                        </div>
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

                    {(r.dokumentasi_path || r.stb_path) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        {r.dokumentasi_path &&
                          (dokUrl ? (
                            <a
                              href={dokUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-border p-1.5 pr-2.5 text-xs font-semibold hover:bg-muted"
                            >
                              <ProductPhoto
                                src={dokUrl}
                                alt="Dokumentasi stok"
                                className="h-9 w-9 rounded border border-border"
                                iconClassName="text-xs"
                              />
                              Dokumentasi
                            </a>
                          ) : (
                            <span className="text-xs text-redup">Dokumentasi tidak tersedia</span>
                          ))}
                        {r.stb_path &&
                          (stbUrl ? (
                            <a
                              href={stbUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold hover:bg-muted"
                            >
                              <span className="fas fa-file-lines text-primary" aria-hidden="true" />
                              STB
                            </a>
                          ) : (
                            <span className="text-xs text-redup">STB tidak tersedia</span>
                          ))}
                      </div>
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
