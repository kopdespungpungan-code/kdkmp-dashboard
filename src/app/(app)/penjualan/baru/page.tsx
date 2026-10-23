import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import { namaBarangSubsidi } from "@/lib/subsidi";
import type { ProductOpt } from "@/lib/types";
import NotaForm from "./NotaForm";

export const dynamic = "force-dynamic";

export default async function NotaBaru({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sb = await createClient();
  const ambilProduk = (kolom: string) =>
    sb.from("products").select(kolom).eq("aktif", true).order("item").limit(5000);

  // foto_url belum ada sampai supabase/produk_foto.sql dijalankan.
  // Query pertama tetap mempertahankan deteksi migrasi subsidi.
  let { data, error: produkError } = await ambilProduk(
    "id, item, sku, gramasi, harga_jual, stok_toko, subsidi, foto_url",
  );
  if (produkError && /foto_url/i.test(produkError.message)) {
    ({ data, error: produkError } = await ambilProduk(
      "id, item, sku, gramasi, harga_jual, stok_toko, subsidi",
    ));
  }

  const belumMigrasi = Boolean(produkError && /subsidi/i.test(produkError.message));
  const produk = (data ?? []) as unknown as ProductOpt[];
  const kandidatSubsidi = produk.filter((p) => !p.subsidi && namaBarangSubsidi(p.item));

  return (
    <>
      <PageHeader title="Nota baru" sub="Stok toko berkurang otomatis setelah nota disimpan." action={<LinkButton href="/penjualan">Batal</LinkButton>} />
      {error && <Alert>{error}</Alert>}
      {belumMigrasi ? (
        <Alert tone="kuning">
          Fitur subsidi belum aktif di database. Jalankan <code>supabase/subsidi.sql</code> di Supabase SQL Editor, lalu muat ulang halaman ini.
        </Alert>
      ) : produkError ? (
        <Alert>{produkError.message}</Alert>
      ) : null}
      {!belumMigrasi && !produkError && kandidatSubsidi.length > 0 && (
        <Alert tone="kuning">
          {kandidatSubsidi.length} barang mungkin subsidi tetapi belum ditandai:{" "}
          {kandidatSubsidi.slice(0, 5).map((p) => p.item).join(", ")}
          {kandidatSubsidi.length > 5 ? ", ..." : ""}. Buka{" "}
          <Link href="/produk?f=kandidat" className="font-semibold underline">
            Produk → Kandidat subsidi
          </Link>{" "}
          dan centang <b>Barang subsidi</b> bila sesuai.
        </Alert>
      )}
      <NotaForm products={produk} />
    </>
  );
}
