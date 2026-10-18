import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { angka, rupiah, todayWIB } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function KeuanganHarian() {
  const sb = await createClient();
  const today = todayWIB();

  const [penjualan] = await Promise.all([
    sb.from("v_omzet_harian").select("*").eq("tanggal", today).maybeSingle(),
  ]);

  const h = penjualan.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Keuangan Harian" sub={today} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Pemasukan Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl text-hijau">
              {h ? rupiah(Number(h.omzet)) : "-"}
            </div>
            <div className="text-xs text-redup mt-1">{h ? angka(Number(h.pcs)) + " pcs terjual" : "Belum ada data"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Jumlah Nota</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl">{h ? angka(Number(h.nota)) : "-"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Rata-rata per Nota</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl">
              {h && h.nota ? rupiah(Number(h.omzet) / Number(h.nota)) : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-redup">Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="font-display font-bold text-2xl text-merah">-</div>
            <div className="text-xs text-redup mt-1">Belum tercatat</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pemasukan (Penjualan)</CardTitle>
          </CardHeader>
          <CardContent>
            {h ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-redup">Omzet</span>
                  <span className="font-semibold">{rupiah(Number(h.omzet))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-redup">Barang terjual</span>
                  <span className="font-semibold">{angka(Number(h.pcs))} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-redup">Jumlah nota</span>
                  <span className="font-semibold">{angka(Number(h.nota))}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-redup py-8">Belum ada penjualan hari ini.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ket">Keterangan</Label>
                <Input id="ket" placeholder="Misal: Beli sembako, listrik, dll." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                <Input id="jumlah" type="number" placeholder="0" />
              </div>
              <Button type="submit" className="w-full">
                Simpan Pengeluaran
              </Button>
            </form>
            <p className="text-xs text-redup mt-3">
              Fitur pengeluaran akan disimpan ke database di versi berikutnya.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
