"use client";

import { angka, tglTanggal } from "@/lib/format";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStore, faClipboardList, faSignature } from "@fortawesome/free-solid-svg-icons";

type StockRow = {
  id: number;
  sku: string;
  item: string;
  gramasi: string;
  stok_toko: number;
  stok_gudang: number;
  expired_terdekat: string | null;
  stok_min: number | null;
  qty_fisik: string;
  /** Kunci unik per baris: satu produk bisa ada di beberapa gondola/tingkat. */
  baris_key: string;
  /** Tingkat yang ditampilkan (bisa hasil koreksi, kosong bila belum diisi). */
  tingkat_label?: string;
};

type SoGondolaPrintProps = {
  today: string;
  petugas: string;
  gondola: string;
  gondolaLokasi: string;
  tingkat: string;
  catatan: string;
  rows: StockRow[];
  hitungSelisih: (stokSistem: number, qtyFisik: string) => string | number;
};

export default function SoGondolaPrint({ today, petugas, gondola, gondolaLokasi, tingkat, catatan, rows, hitungSelisih }: SoGondolaPrintProps) {
  const hitungTotalSelisih = () => {
    let total = 0;
    let adaValid = false;
    for (const row of rows) {
      const s = hitungSelisih(row.stok_toko, row.qty_fisik);
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
          <span className="text-lg font-bold font-display text-ink">SO Gondola - Grocery</span>
          <span className="text-sm font-mono text-muted-foreground border border-border/50 px-2 py-0.5 rounded">
            {petugas} / {gondolaLokasi}
          </span>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span><FontAwesomeIcon icon={faClipboardList} className="mr-1 text-primary w-4 h-4" /> Tanggal: {tglTanggal(today)}</span>
          <span><FontAwesomeIcon icon={faStore} className="mr-1 text-primary w-4 h-4" /> Petugas: {petugas}</span>
          <span>Gondola: {gondolaLokasi} | Tingkat: {tingkat}</span>
        </div>
      </div>

      {/* ===== TABEL STOK ===== */}
      <div className="overflow-hidden">
        <table className="w-full text-xs border-collapse border border-border/50">
          <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="p-2 border border-border/50 text-center">No</th>
              <th className="p-2 border border-border/50 text-left">SKU</th>
              <th className="p-2 border border-border/50 text-left">Nama Produk</th>
              <th className="p-2 border border-border/50 text-left">Gramasi</th>
              <th className="p-2 border border-border/50 text-center">Tingkat</th>
              <th className="p-2 border border-border/50 text-center">Stok Sistem</th>
              <th className="p-2 border border-border/50 text-center">Stok Gudang</th>
              <th className="p-2 border border-border/50 text-center">Qty Fisik</th>
              <th className="p-2 border border-border/50 text-center">Selisih</th>
              <th className="p-2 border border-border/50 text-center">Expired</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const selisih = hitungSelisih(row.stok_toko, row.qty_fisik);
              const selisihDisplay = typeof selisih === "number" ? (selisih >= 0 ? "+" : "") + angka(selisih) : "-";
              return (
                <tr key={row.baris_key} className="border-b border-border/50">
                  <td className="p-2 border border-border/50 text-center text-[10px] text-muted-foreground">{index + 1}</td>
                  <td className="p-2 border border-border/50 text-left text-[10px] font-mono">{row.sku}</td>
                  <td className="p-2 border border-border/50 text-left text-[10px] font-medium truncate max-w-[40px]">{row.item}</td>
                  <td className="p-2 border border-border/50 text-left text-[10px] text-muted-foreground">{row.gramasi}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{row.tingkat_label || "-"}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(row.stok_toko)}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{angka(row.stok_gudang)}</td>
                  <td className="p-2 border border-border/50 text-center text-[10px] font-mono">{row.qty_fisik || "-"}</td>
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
              <td className="p-2 border border-border/50 text-center" colSpan={8}>Total Selisih</td>
              <td className="p-2 border border-border/50 text-center text-[10px] font-mono text-primary">
                {hitungTotalSelisih() >= 0 ? "+" : ""}{angka(hitungTotalSelisih())}
              </td>
              <td className="p-2 border border-border/50 text-center"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {catatan && (
        <div className="mt-4 p-3 bg-secondary/50 rounded border border-border/50 text-[10px] text-muted-foreground">
          <strong className="text-ink">Catatan:</strong> {catatan}
        </div>
      )}

      {/* ===== TTD ===== */}
      <div className="mt-8 flex justify-between">
        <div className="w-[30%] flex flex-col items-center">
          <div className="w-full h-px bg-border mb-2"></div>
          <div className="text-[10px] text-muted-foreground">Dibuat</div>
          <div className="mt-4 text-[10px] text-muted-foreground">
            <FontAwesomeIcon icon={faSignature} className="mr-1 w-4 h-4" />
            .......................................
          </div>
          <div className="text-[10px] text-muted-foreground">Nama &nbsp;&nbsp;&nbsp;&nbsp; Tanggal</div>
        </div>
        <div className="w-[30%] flex flex-col items-center">
          <div className="w-full h-px bg-border mb-2"></div>
          <div className="text-[10px] text-muted-foreground">Diperiksa</div>
          <div className="mt-4 text-[10px] text-muted-foreground">
            <FontAwesomeIcon icon={faSignature} className="mr-1 w-4 h-4" />
            .......................................
          </div>
          <div className="text-[10px] text-muted-foreground">Nama &nbsp;&nbsp;&nbsp;&nbsp; Tanggal</div>
        </div>
        <div className="w-[30%] flex flex-col items-center">
          <div className="w-full h-px bg-border mb-2"></div>
          <div className="text-[10px] text-muted-foreground">Disetujui</div>
          <div className="mt-4 text-[10px] text-muted-foreground">
            <FontAwesomeIcon icon={faSignature} className="mr-1 w-4 h-4" />
            .......................................
          </div>
          <div className="text-[10px] text-muted-foreground">Nama &nbsp;&nbsp;&nbsp;&nbsp; Tanggal</div>
        </div>
      </div>

      <div className="mt-6 text-[9px] text-muted-foreground text-center">
        Dicetak dari Sistem Dashboard KDKMP Pungpungan &nbsp;|&nbsp; SO Gondola Grocery
      </div>
    </div>
  );
}
