"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faCalculator, faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { angka, tglTanggal } from "@/lib/format";
import SoHarianPrint from "./SoHarianPrint";

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

type SoHarianClientProps = {
  today: string;
  rows: StockRow[];
};

export default function SoHarianClient({ today, rows }: SoHarianClientProps) {
  const [stockData, setStockData] = useState<StockRow[]>(rows);
  const [catatan, setCatatan] = useState("");
  const [printing, setPrinting] = useState(false);

  const handleStokRealChange = useCallback(
    (index: number, value: string) => {
      setStockData((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], stok_real: value };
        return next;
      });
    },
    []
  );

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

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="no-print space-y-6">
      <div>
        <PageHeader title="SO Harian" sub={today ? new Date(today).toLocaleDateString("id-ID") : ""} />
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FontAwesomeIcon icon={faClipboardList} className="text-primary" />
              Konfigurasi Surat Order
            </CardTitle>
            <CardDescription>
              Isi nomor surat dan catatan sebelum mencetak SO harian.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nomor-surat">Nomor Surat</Label>
                <Input
                  id="nomor-surat"
                  value={"SO/" + today.split("-").join("")}
                  readOnly
                  placeholder="SO/20261020"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catatan">Catatan</Label>
                <Input
                  id="catatan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Stok cocok dengan sistem"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handlePrint}
                  disabled={printing}
                  className="w-full"
                >
                  {printing ? "Mencetak..." : (
                    <span>
                      <FontAwesomeIcon icon={faPrint} className="mr-2" />
                      Cetak SO
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stockData.length === 0 ? (
        <div>
          <Alert>Tidak ada produk aktif untuk dicetak dalam SO harian.</Alert>
        </div>
      ) : (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCalculator} className="text-primary" />
                Tabel Stok Harian
              </CardTitle>
              <CardDescription>
                Isi Stok Real fisik di toko untuk setiap produk. Selisih akan dihitung otomatis.
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
                      <th className="p-3 text-right border-b border-border">Stok Sistem Toko</th>
                      <th className="p-3 text-right border-b border-border">Stok Gudang</th>
                      <th className="p-3 text-center border-b border-border">Stok Real Fisik</th>
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
                        <tr key={row.id} className="border-b border-border hover:bg-accent transition-colors group">
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
              {catatan && (
                <div className="mt-3 p-3 bg-muted rounded border border-border text-sm text-muted-foreground">
                  <strong>Catatan:</strong> {catatan}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>

      <div className="print-only">
        <SoHarianPrint
          today={today}
          nomorSurat={"SO/" + today.split("-").join("")}
          catatan={catatan}
          rows={stockData}
          hitungSelisih={hitungSelisih}
        />
      </div>
    </motion.div>
  );
}
