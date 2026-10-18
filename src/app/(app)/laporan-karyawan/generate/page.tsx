"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { angka, rupiah, tglPanjang, todayWIB } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type ExtractedData = {
  jenis_dokumen?: string;
  tanggal?: string;
  karyawan?: { nama: string; jabatan?: string; status?: string; jam_masuk?: string; jam_keluar?: string }[];
  ringkasan?: string;
  catatan?: string;
};

export default function GenerateLaporan() {
  const [data, setData] = useState<ExtractedData | null>(null);
  const [penjualan, setPenjualan] = useState<any>(null);
  const [stok, setStok] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const today = todayWIB();

  useEffect(() => {
    async function load() {
      try {
        const saved = sessionStorage.getItem("laporan_siap");
        if (saved) setData(JSON.parse(saved));

        const sb = createClient();
        const [p, s] = await Promise.all([
          sb.from("v_omzet_harian").select("*").eq("tanggal", today).maybeSingle(),
          sb.from("v_ringkasan_stok").select("*").single(),
        ]);
        setPenjualan(p.data);
        setStok(s.data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [today]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Generate Laporan Harian" sub="Menyiapkan laporan..." />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const h = penjualan;
  const r = stok;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <PageHeader title="Laporan Harian" sub={tglPanjang(today)} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            🖨️ Cetak / PDF
          </Button>
        </div>
      </div>

      {/* Laporan Card - printable */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="text-center border-b border-garis">
          <div className="space-y-1">
            <h1 className="text-xl font-bold font-display">LAPORAN HARIAN TOKO</h1>
            <p className="text-sm text-redup">Koperasi Desa Merah Putih Pungpungan</p>
            <p className="text-sm font-semibold">{tglPanjang(today)}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Section 1: Absensi Karyawan */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">👥 Absensi Karyawan</h2>
            {data?.karyawan && data.karyawan.length > 0 ? (
              <div className="space-y-2">
                {data.karyawan.map((k, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border border-garis rounded-lg text-sm">
                    <div>
                      <span className="font-semibold">{k.nama}</span>
                      {k.jabatan && <span className="text-redup ml-2">({k.jabatan})</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={k.status === "hadir" ? "hijau" : k.status === "izin" ? "kuning" : k.status === "sakit" ? "kuning" : "merah"}>
                        {k.status ?? "belum"}
                      </Badge>
                      {k.jam_masuk && (
                        <span className="text-xs text-redup">{k.jam_masuk} - {k.jam_keluar ?? "..."}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-redup">Tidak ada data absensi dari dokumen.</p>
            )}
            {data?.ringkasan && (
              <p className="mt-2 text-sm text-redup">{data.ringkasan}</p>
            )}
          </section>

          <Separator />

          {/* Section 2: Penjualan */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">💰 Penjualan Harian</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Omzet</div>
                <div className="font-bold text-merah">{h ? rupiah(Number(h.omzet)) : "-"}</div>
              </div>
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Nota</div>
                <div className="font-bold">{h ? angka(Number(h.nota)) : "-"}</div>
              </div>
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Barang Terjual</div>
                <div className="font-bold">{h ? angka(Number(h.pcs)) : "-"}</div>
              </div>
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Rata-rata/Nota</div>
                <div className="font-bold">{h && h.nota ? rupiah(Number(h.omzet) / Number(h.nota)) : "-"}</div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 3: Stok */}
          <section>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">📦 Status Stok</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Jenis Produk</div>
                <div className="font-bold">{r ? angka(Number(r.jenis_produk)) : "-"}</div>
              </div>
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Total Stok</div>
                <div className="font-bold">{r ? angka(Number(r.total_stok)) : "-"}</div>
              </div>
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Habis/Minus</div>
                <div className="font-bold text-merah">{r ? angka(Number(r.habis)) : "-"}</div>
              </div>
              <div className="p-3 border border-garis rounded-lg text-center">
                <div className="text-xs text-redup">Menipis</div>
                <div className="font-bold text-kuning">{r ? angka(Number(r.menipis)) : "-"}</div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 4: Catatan */}
          {data?.catatan && (
            <>
              <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">📝 Catatan</h2>
                <p className="text-sm">{data.catatan}</p>
              </section>
              <Separator />
            </>
          )}

          {/* Section 5: TTD */}
          <section className="pt-4">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">✍️ Tanda Tangan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="h-20 border-b border-ink mb-2" />
                <p className="text-sm font-semibold">Pengurus</p>
                <p className="text-xs text-redup">Koperasi Desa Merah Putih</p>
              </div>
              <div className="text-center">
                <div className="h-20 border-b border-ink mb-2" />
                <p className="text-sm font-semibold">Kasir</p>
                <p className="text-xs text-redup">Petugas Kasir</p>
              </div>
              <div className="text-center">
                <div className="h-20 border-b border-ink mb-2" />
                <p className="text-sm font-semibold">Petugas Stok</p>
                <p className="text-xs text-redup">Petugas Gudang</p>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="flex justify-center print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          🖨️ Cetak Laporan / Simpan PDF
        </Button>
      </div>
    </div>
  );
}
