import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { angka, rupiah, todayWIB } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SummaryHarian() {
  const sb = await createClient();
  const today = todayWIB();

  const [penjualan, stok] = await Promise.all([
    sb.from("v_omzet_harian").select("*").eq("tanggal", today).maybeSingle(),
    sb.from("v_ringkasan_stok").select("*").single(),
  ]);

  const h = penjualan.data;
  const r = stok.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Summary Harian" sub={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Omzet Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl text-merah">
              {h ? rupiah(Number(h.omzet)) : "-"}
            </div>
            <div className="text-xs text-redup mt-1">
              {h ? angka(Number(h.nota)) + " nota" : "Belum ada data"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Barang Terjual</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl">
              {h ? angka(Number(h.pcs)) : "-"} pcs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Produk Habis / Minus</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl text-merah">
              {r ? angka(Number(r.habis)) : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Produk Menipis</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl text-kuning">
              {r ? angka(Number(r.menipis)) : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Stok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-redup">Total jenis produk</span>
                <span className="font-semibold">{r ? angka(Number(r.jenis_produk)) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-redup">Total stok (pcs)</span>
                <span className="font-semibold">{r ? angka(Number(r.total_stok)) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-redup">Hampir expired</span>
                <span className="font-semibold text-kuning">{r ? angka(Number(r.hampir_expired)) : "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/penjualan/baru">Buat Nota Penjualan</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/produk">Kelola Produk</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/stok">Opname Stok</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/laporan-harian/absensi">Input Absensi</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
