"use client";

import { angka, rupiah, tglPanjang, tglTanggal } from "@/lib/format";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faFileInvoice, faBox, faClipboardCheck, faSignature } from "@fortawesome/free-solid-svg-icons";

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

type HarianPrintProps = {
  today: string;
  nomorLaporan: string;
  penjualan: Penjualan;
  ringkasan: Ringkasan;
  stockData: StockRow[];
  terlaris: { id: number; item: string; pcs: number; omzet: number }[];
  perhatian: { id: number; item: string; stok_toko: number; stok_gudang: number; stok_total: number; stok_min: number | null; expired_terdekat: string | null }[];
  soGondola: SoGondolaSummary[];
  catatan: string;
  pengeluaran: string;
  ketPengeluaran: string;
  absensi: string;
  hitungSelisih: (stokSistem: number, stokReal: string) => string | number;
};

export default function HarianPrint({ today, nomorLaporan, penjualan, ringkasan, stockData, terlaris, perhatian, soGondola, catatan, pengeluaran, ketPengeluaran, absensi, hitungSelisih }: HarianPrintProps) {
  const hitungTotalSelisih = () => {
    let total = 0;
    let adaValid = false;
    for (const row of stockData) {
      const s = hitungSelisih(row.stok_toko, row.stok_real);
      if (typeof s === "number") {
        total += s;
        adaValid = true;
      }
    }
    return adaValid ? total : 0;
  };

  return (
    <div className="print-layout max-w-[210mm] mx-auto p-6 bg-white">
      {/* ===== KOP SURAT ===== */}
      <div className="kop-surat mb-6 border-b-4 border-primary pb-4">
        <div className="flex items-start gap-3">
          <img
            src="/assets/logo-kopdes.jpg"
            alt="Logo KDKMP"
            className="h-16 w-16 object-cover rounded-md shadow-sm"
          />
          <div className="flex flex-col justify-center">
            <div className="text-2xl font-bold font-display text-ink tracking-tight">
              Koperasi Desa Merah Putih
            </div>
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">
              Toko Pungpungan
            </div>
            <div className="text-[10px] text-muted-foreground">
              Kalitidu, Bojonegoro &nbsp;|&nbsp; Koperasi Desa Merah Putih Pungpungan
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-lg font-bold font-display text-ink">Laporan Harian</span>
          <span className="text-sm font-mono text-muted-foreground border border-border/50 px-2 py-0.5 rounded">
            {nomorLaporan}
          </span>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span><FontAwesomeIcon icon={faFileInvoice} className="mr-1 text-primary w-4 h-4" /> Tanggal: {tglPanjang(today)}</span>
          <span><FontAwesomeIcon icon={faStore} className="mr-1 text-primary w-4 h-4" /> Toko: Pungpungan</span>
        </div>
      </div>

      {/* ===== Ringkasan Penjualan ===== */}
      <div className="mb-4">
        <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Ringkasan Penjualan</div>
        {penjualan ? (
          <table className="w-full text-xs border-collapse border border-border/50">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-2 border border-border/50 text-left">Keterangan</th>
                <th className="p-2 border border-border/50 text-right">Nilai</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Omzet Hari Ini</td>
                <td className="p-2 border border-border/50 text-right font-semibold text-primary">{rupiah(Number(penjualan.omzet))}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Jumlah Nota</td>
                <td className="p-2 border border-border/50 text-right">{angka(Number(penjualan.nota))}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Barang Terjual (pcs)</td>
                <td className="p-2 border border-border/50 text-right">{angka(Number(penjualan.pcs))} pcs</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Rata-rata per Nota</td>
                <td className="p-2 border border-border/50 text-right">{penjualan.nota ? rupiah(Number(penjualan.omzet) / Number(penjualan.nota)) : "-"}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="text-[10px] text-muted-foreground py-2">Belum ada penjualan hari ini.</div>
        )}
      </div>

      {/* ===== Status Stok ===== */}
      <div className="mb-4">
        <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Status Stok</div>
        {ringkasan ? (
          <table className="w-full text-xs border-collapse border border-border/50">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-2 border border-border/50 text-left">Keterangan</th>
                <th className="p-2 border border-border/50 text-right">Nilai</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Total Jenis Produk</td>
                <td className="p-2 border border-border/50 text-right">{angka(Number(ringkasan.jenis_produk))}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Total Stok (pcs)</td>
                <td className="p-2 border border-border/50 text-right">{angka(Number(ringkasan.total_stok))}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Habis / Minus</td>
                <td className="p-2 border border-border/50 text-right text-destructive">{angka(Number(ringkasan.habis))}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Menipis</td>
                <td className="p-2 border border-border/50 text-right text-kuning">{angka(Number(ringkasan.menipis))}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="p-2 border border-border/50 text-left">Hampir Expired</td>
                <td className="p-2 border border-border/50 text-right text-kuning">{angka(Number(ringkasan.hampir_expired))}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="text-[10px] text-muted-foreground py-2">Data stok belum tersedia.</div>
        )}
      </div>

      {/* ===== Detail Stok ===== */}
      <div className="mb-4">
        <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Detail Stok Harian</div>
        <div className="overflow-hidden">
          <table className="w-full text-xs border-collapse border border-border/50">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-2 border border-border/50 text-center">No</th>
                <th className="p-2 border border-border/50 text-left">SKU</th>
                <th className="p-2 border border-border/50 text-left">Nama Produk</th>
                <th className="p-2 border border-border/50 text-left">Gramasi</th>
                <th className="p-2 border border-border/50 text-center">Stok Sistem</th>
                <th className="p-2 border border-border/50 text-center">Stok Gudang</th>
                <th className="p-2 border border-border/50 text-center">Stok Real</th>
                <th className="p-2 border border-border/50 text-center">Selisih</th>
                <th className="p-2 border border-border/50 text-center">Expired</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((row, index) => {
                const selisih = hitungSelisih(row.stok_toko, row.stok_real);
                const selisihDisplay = typeof selisih === "number" ? (selisih >= 0 ? "+" : "") + angka(selisih) : "-";
                return (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="p-2 border border-border/50 text-center text-[10px] text-muted-foreground">{index + 1}</td>
                    <td className="p-2 border border-border/50 text-left text-[10px] font-mono">{row.sku}</td>
                    <td className="p-2 border border-border/50 text-left text-[10px] font-medium truncate max-w-[40px]">{row.item}</td>
                    <td className="p-2 border border-border/50 text-left text-[10px] text-muted-foreground">{row.gramasi}</td>
                    <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(row.stok_toko)}</td>
                    <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(row.stok_gudang)}</td>
                    <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{row.stok_real || "-"}</td>
                    <td className={`p-2 border border-border/50 text-center text-[10px] font-semibold ${typeof selisih === "number" && selisih !== 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {selisihDisplay}
                    </td>
                    <td className={`p-2 border border-border/50 text-center text-[10px] ${row.expired_terdekat ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {row.expired_terdekat ? tglTanggal(row.expired_terdekat) : "-"}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-secondary font-semibold text-ink">
                <td className="p-2 border border-border/50 text-center" colSpan={7}>Total Selisih</td>
                <td className="p-2 border border-border/50 text-center text-[10px] font-mono text-primary">
                  {hitungTotalSelisih() >= 0 ? "+" : ""}{angka(hitungTotalSelisih())}
                </td>
                <td className="p-2 border border-border/50 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Terlaris 30 Hari ===== */}
      {terlaris.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Produk Terlaris 30 Hari</div>
          <table className="w-full text-xs border-collapse border border-border/50">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-2 border border-border/50 text-center">No</th>
                <th className="p-2 border border-border/50 text-left">Nama Produk</th>
                <th className="p-2 border border-border/50 text-center">Pcs Terjual</th>
              </tr>
            </thead>
            <tbody>
              {terlaris.slice(0, 8).map((p, index) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="p-2 border border-border/50 text-center text-[10px] text-muted-foreground">{index + 1}</td>
                  <td className="p-2 border border-border/50 text-left text-[10px] font-medium">{p.item}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(Number(p.pcs))} pcs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Perlu Perhatian ===== */}
      {perhatian.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Perlu Perhatian</div>
          <table className="w-full text-xs border-collapse border border-border/50">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-2 border border-border/50 text-left">Nama Produk</th>
                <th className="p-2 border border-border/50 text-center">Stok Toko</th>
                <th className="p-2 border border-border/50 text-center">Stok Gudang</th>
                <th className="p-2 border border-border/50 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {perhatian.slice(0, 5).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="p-2 border border-border/50 text-left text-[10px] font-medium">{p.item}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(Number(p.stok_toko))}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(Number(p.stok_gudang))}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-semibold text-destructive">
                    {p.stok_total <= 0 ? "Habis" : "Menipis"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Keuangan ===== */}
      <div className="mb-4">
        <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Keuangan Harian</div>
        <table className="w-full text-xs border-collapse border border-border/50">
          <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="p-2 border border-border/50 text-left">Keterangan</th>
              <th className="p-2 border border-border/50 text-right">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="p-2 border border-border/50 text-left">Pemasukan (Penjualan)</td>
              <td className="p-2 border border-border/50 text-right font-semibold text-primary">{penjualan ? rupiah(Number(penjualan.omzet)) : "-"}</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="p-2 border border-border/50 text-left">Pengeluaran</td>
              <td className="p-2 border border-border/50 text-right text-destructive">{pengeluaran ? rupiah(Number(pengeluaran)) : "-"}</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="p-2 border border-border/50 text-left">Keterangan Pengeluaran</td>
              <td className="p-2 border border-border/50 text-right">{ketPengeluaran || "-"}</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="p-2 border border-border/50 text-left font-semibold">Laba / (Rugi)</td>
              <td className="p-2 border border-border/50 text-right font-semibold text-primary">
                {penjualan && pengeluaran ? rupiah(Number(penjualan.omzet) - Number(pengeluaran)) : "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== Absensi ===== */}
      {absensi && (
        <div className="mb-4">
          <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Absensi Karyawan</div>
          <div className="text-[10px] text-muted-foreground p-2 border border-border/50 rounded">{absensi}</div>
        </div>
      )}

      {/* ===== Catatan ===== */}
      {catatan && (
        <div className="mb-4">
          <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">Catatan Harian</div>
          <div className="text-[10px] text-muted-foreground p-2 border border-border/50 rounded">{catatan}</div>
        </div>
      )}

      {/* ===== SO Gondola ===== */}
      {soGondola.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-bold text-ink border-b border-border/50 pb-1 mb-2">SO Gondola Hari Ini</div>
          <table className="w-full text-xs border-collapse border border-border/50">
            <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-2 border border-border/50 text-left">Petugas</th>
                <th className="p-2 border border-border/50 text-left">Gondola</th>
                <th className="p-2 border border-border/50 text-center">Tingkat</th>
                <th className="p-2 border border-border/50 text-center">Jml Produk</th>
                <th className="p-2 border border-border/50 text-center">Qty Fisik</th>
                <th className="p-2 border border-border/50 text-center">Stok Sistem</th>
                <th className="p-2 border border-border/50 text-center">Selisih</th>
                <th className="p-2 border border-border/50 text-center">Rusak/EXP</th>
              </tr>
            </thead>
            <tbody>
              {soGondola.map((s) => (
                <tr key={s.gondola_no + "-" + s.tingkat} className="border-b border-border/50">
                  <td className="p-2 border border-border/50 text-left text-[10px] font-medium">{s.petugas}</td>
                  <td className="p-2 border border-border/50 text-left text-[10px]">{s.gondola_lokasi}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px]">{s.tingkat}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(Number(s.jumlah_produk))}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(Number(s.total_qty_fisik))}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(Number(s.total_stok_sistem))}</td>
                  <td className={`p-2 border border-border/50 text-center text-[10px] font-semibold ${s.total_selisih < 0 ? "text-destructive" : s.total_selisih > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {s.total_selisih >= 0 ? "+" : ""}{angka(Number(s.total_selisih))}
                  </td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(Number(s.total_rusak_exp))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== TTD ===== */}
      <div className="mt-8 flex justify-between">
        <div className="w-[45%] flex flex-col items-center">
          <div className="w-full h-px bg-border mb-2"></div>
          <div className="text-[10px] text-muted-foreground">Manajer / Mengetahui</div>
          <div className="mt-4 text-[10px] text-muted-foreground">
            <FontAwesomeIcon icon={faSignature} className="mr-1 w-4 h-4" />
            .......................................
          </div>
          <div className="text-[10px] text-muted-foreground">Nama &nbsp;&nbsp;&nbsp;&nbsp; Tanggal</div>
        </div>
        <div className="w-[45%] flex flex-col items-center">
          <div className="w-full h-px bg-border mb-2"></div>
          <div className="text-[10px] text-muted-foreground">Pengurus</div>
          <div className="mt-4 text-[10px] text-muted-foreground">
            <FontAwesomeIcon icon={faSignature} className="mr-1 w-4 h-4" />
            .......................................
          </div>
          <div className="text-[10px] text-muted-foreground">Nama &nbsp;&nbsp;&nbsp;&nbsp; Tanggal</div>
        </div>
      </div>

      <div className="mt-6 text-[9px] text-muted-foreground text-center">
        Dicetak dari Sistem Dashboard KDKMP Pungpungan &nbsp;|&nbsp; Laporan Harian
      </div>
    </div>
  );
}
