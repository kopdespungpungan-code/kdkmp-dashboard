"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faFileInvoice, faBox, faUsers, faMoneyBill, faClipboardCheck } from "@fortawesome/free-solid-svg-icons";
import { angka, rupiah, tglPanjang, tglTanggal } from "@/lib/format";
import HarianPrint from "./HarianPrint";

type StockRow = {
  id: number;
  sku: string;
  item: string;
  gramasi: string;
  stok_toko: number;
  stok_gudang: number;
  expired_terdekat: string | null;
  stok_min: number | null;
  stok_real: string;
};

type Penjualan = {
  tanggal: string;
  nota: number;
  pcs: number;
  omzet: number;
} | null;

type Ringkasan = {
  jenis_produk: number;
  total_stok: number;
  menipis: number;
  habis: number;
  hampir_expired: number;
} | null;

type SoGondolaSummary = {
  tanggal: string;
  petugas: string;
  gondola_no: number;
  gondola_lokasi: string;
  tingkat: number;
  jumlah_produk: number;
  total_qty_fisik: number;
  total_stok_sistem: number;
  total_selisih: number;
  total_rusak_exp: number;
};

type HarianClientProps = {
  today: string;
  penjualan: Penjualan;
  ringkasan: Ringkasan;
  rows: StockRow[];
  terlaris: { id: number; item: string; pcs: number; omzet: number }[];
  perhatian: { id: number; item: string; stok_toko: number; stok_gudang: number; stok_total: number; stok_min: number | null; expired_terdekat: string | null }[];
  soGondola: SoGondolaSummary[];
  nomorLaporan: string;
};

export default function HarianClient({ today, penjualan, ringkasan, rows, terlaris, perhatian, soGondola, nomorLaporan }: HarianClientProps) {
  const [stockData, setStockData] = useState<StockRow[]>(rows);
  const [catatan, setCatatan] = useState("");
  const [pengeluaran, setPengeluaran] = useState("");
  const [ketPengeluaran, setKetPengeluaran] = useState("");
  const [absensi, setAbsensi] = useState("");
  const [printing, setPrinting] = useState(false);

  const handleStokRealChange = useCallback((index: number, value: string) => {
    setStockData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], stok_real: value };
      return next;
    });
  }, []);

  const hitungSelisih = (stokSistem: number, stokReal: string) => {
    const real = parseInt(stokReal, 10);
    if (isNaN(real)) return "-";
    return real - stokSistem;
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  const p = penjualan;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="no-print space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader title="Laporan Harian" sub={tglPanjang(today)} />
      </motion.div>

      {/* ===== Ringkasan Penjualan ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faFileInvoice} className="text-primary" />
              Ringkasan Penjualan Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {p ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Omzet</div>
                  <div className="font-display font-bold text-xl text-primary">{rupiah(Number(p.omzet))}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Jumlah Nota</div>
                  <div className="font-display font-bold text-xl">{angka(Number(p.nota))}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Barang Terjual</div>
                  <div className="font-display font-bold text-xl">{angka(Number(p.pcs))} pcs</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Rata-rata per Nota</div>
                  <div className="font-display font-bold text-xl">{p.nota ? rupiah(Number(p.omzet) / Number(p.nota)) : "-"}</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">Belum ada penjualan hari ini.</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Status Stok ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBox} className="text-primary" />
              Status Stok
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {ringkasan ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Jenis Produk</div>
                  <div className="font-display font-bold text-xl">{angka(Number(ringkasan.jenis_produk))}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Total Stok (pcs)</div>
                  <div className="font-display font-bold text-xl">{angka(Number(ringkasan.total_stok))}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Habis / Minus</div>
                  <div className="font-display font-bold text-xl text-destructive">{angka(Number(ringkasan.habis))}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Menipis</div>
                  <div className="font-display font-bold text-xl text-kuning">{angka(Number(ringkasan.menipis))}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Hampir Expired</div>
                  <div className="font-display font-bold text-xl text-kuning">{angka(Number(ringkasan.hampir_expired))}</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">Data stok belum tersedia.</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Stok Detail ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-primary" />
              Detail Stok Harian
            </CardTitle>
            <CardDescription>
              Isi Stok Real (fisik) jika data belum ada. Selisih dihitung otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="p-3 text-left border-b border-border">No</th>
                    <th className="p-3 text-left border-b border-border">SKU</th>
                    <th className="p-3 text-left border-b border-border">Nama Produk</th>
                    <th className="p-3 text-left border-b border-border">Gramasi</th>
                    <th className="p-3 text-right border-b border-border">Stok Sistem</th>
                    <th className="p-3 text-right border-b border-border">Stok Gudang</th>
                    <th className="p-3 text-center border-b border-border">Stok Real</th>
                    <th className="p-3 text-right border-b border-border">Selisih</th>
                    <th className="p-3 text-left border-b border-border">Expired</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((row, index) => {
                    const selisih = hitungSelisih(row.stok_toko, row.stok_real);
                    let selisihClass = "text-muted-foreground";
                    if (selisih !== "-" && typeof selisih === "number") {
                      if (selisih < 0) selisihClass = "text-destructive";
                      else if (selisih > 0) selisihClass = "text-primary";
                      else selisihClass = "text-hijau";
                    }
                    return (
                      <tr key={row.id} className="border-b border-border hover:bg-accent transition-colors">
                        <td className="p-3 border-b border-border text-muted-foreground">{index + 1}</td>
                        <td className="p-3 border-b border-border font-mono text-xs">{row.sku}</td>
                        <td className="p-3 border-b border-border font-medium truncate max-w-[150px]">{row.item}</td>
                        <td className="p-3 border-b border-border text-xs text-muted-foreground">{row.gramasi}</td>
                        <td className="p-3 border-b border-border text-right font-mono">{angka(row.stok_toko)}</td>
                        <td className="p-3 border-b border-border text-right font-mono">{angka(row.stok_gudang)}</td>
                        <td className="p-3 border-b border-border">
                          <Input
                            type="number"
                            value={row.stok_real}
                            onChange={(e) => handleStokRealChange(index, e.target.value)}
                            className="h-8 w-full text-sm text-center border-input bg-background"
                            placeholder="0"
                          />
                        </td>
                        <td className={"p-3 border-b border-border text-right font-semibold " + selisihClass}>
                          {typeof selisih === "number" ? (selisih >= 0 ? "+" : "") + angka(selisih) : selisih}
                        </td>
                        <td className={"p-3 border-b border-border text-xs " + (row.expired_terdekat ? "font-semibold text-destructive" : "text-muted-foreground")}>
                          {row.expired_terdekat ? tglTanggal(row.expired_terdekat) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Terlaris ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBox} className="text-primary" />
              Produk Terlaris 30 Hari
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {terlaris.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">Belum ada penjualan.</div>
            ) : (
              <div className="divide-y divide-border">
                {terlaris.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <span className="min-w-0 truncate text-sm">{p.item}</span>
                    <span className="shrink-0 font-semibold text-sm">{angka(Number(p.pcs))} pcs</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Perlu Perhatian ===== */}
      {perhatian.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faClipboardCheck} className="text-primary" />
                Perlu Perhatian
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {perhatian.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate">{p.item}</span>
                    <Badge tone={p.stok_total <= 0 ? "merah" : "kuning"}>
                      {p.stok_total <= 0 ? "Habis" : "Menipis"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== SO Gondola ===== */}
      {soGondola.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.55 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBox} className="text-primary" />
                SO Gondola Hari Ini
              </CardTitle>
              <CardDescription>
                Ringkasan Stock Opname per gondola yang dilakukan hari ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="p-3 text-left border-b border-border">Petugas</th>
                      <th className="p-3 text-left border-b border-border">Gondola</th>
                      <th className="p-3 text-center border-b border-border">Tingkat</th>
                      <th className="p-3 text-right border-b border-border">Jumlah Produk</th>
                      <th className="p-3 text-right border-b border-border">Qty Fisik</th>
                      <th className="p-3 text-right border-b border-border">Stok Sistem</th>
                      <th className="p-3 text-right border-b border-border">Selisih</th>
                      <th className="p-3 text-right border-b border-border">Rusak/EXP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soGondola.map((s) => (
                      <tr key={s.gondola_no + "-" + s.tingkat} className="border-b border-border hover:bg-accent transition-colors">
                        <td className="p-3 border-b border-border font-medium">{s.petugas}</td>
                        <td className="p-3 border-b border-border">{s.gondola_lokasi}</td>
                        <td className="p-3 border-b border-border text-center">{s.tingkat}</td>
                        <td className="p-3 border-b border-border text-right font-mono">{angka(Number(s.jumlah_produk))}</td>
                        <td className="p-3 border-b border-border text-right font-mono">{angka(Number(s.total_qty_fisik))}</td>
                        <td className="p-3 border-b border-border text-right font-mono">{angka(Number(s.total_stok_sistem))}</td>
                        <td className={"p-3 border-b border-border text-right font-semibold " + (s.total_selisih < 0 ? "text-destructive" : s.total_selisih > 0 ? "text-primary" : "text-hijau")}>
                          {s.total_selisih >= 0 ? "+" : ""}{angka(Number(s.total_selisih))}
                        </td>
                        <td className="p-3 border-b border-border text-right font-mono">{angka(Number(s.total_rusak_exp))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ===== Input Manual (jika data DB tidak ada) ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.6 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUsers} className="text-primary" />
              Input Manual (jika data DB tidak tersedia)
            </CardTitle>
            <CardDescription>
              Isi absensi, pengeluaran, dan catatan jika data belum ada di database.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="absensi">Absensi Hari Ini</Label>
                <Input
                  id="absensi"
                  value={absensi}
                  onChange={(e) => setAbsensi(e.target.value)}
                  placeholder="Contoh: Budi, Siti, Ahmad - semua masuk"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pengeluaran">Pengeluaran (Rp)</Label>
                <Input
                  id="pengeluaran"
                  type="number"
                  value={pengeluaran}
                  onChange={(e) => setPengeluaran(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ket-pengeluaran">Keterangan Pengeluaran</Label>
                <Input
                  id="ket-pengeluaran"
                  value={ketPengeluaran}
                  onChange={(e) => setKetPengeluaran(e.target.value)}
                  placeholder="Misal: Beli sembako, listrik, dll."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="catatan">Catatan Harian</Label>
                <Input
                  id="catatan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan umum harian"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Konfigurasi & Cetak ===== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.7 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faPrint} className="text-primary" />
              Generate & Cetak Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handlePrint} disabled={printing} className="w-full sm:w-auto">
                {printing ? "Mencetak..." : (
                  <span>
                    <FontAwesomeIcon icon={faPrint} className="mr-2" />
                    Cetak Laporan Harian
                  </span>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Laporan akan dicetak dengan kop surat, semua ringkasan, dan kolom TTD untuk Manajer & Pengurus.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      </div>

      {/* ===== Print-only ===== */}
      <div className="print-only">
        <HarianPrint
          today={today}
          nomorLaporan={nomorLaporan}
          penjualan={penjualan}
          ringkasan={ringkasan}
          stockData={stockData}
          terlaris={terlaris}
          perhatian={perhatian}
          soGondola={soGondola}
          catatan={catatan}
          pengeluaran={pengeluaran}
          ketPengeluaran={ketPengeluaran}
          absensi={absensi}
          hitungSelisih={hitungSelisih}
        />
      </div>
    </motion.div>
  );
}
