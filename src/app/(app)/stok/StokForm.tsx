"use client";
import { useRef, useState } from "react";
import ProductSelect from "@/components/ProductSelect";
import DokumenStok from "@/components/DokumenStok";
import SubmitButton from "@/components/SubmitButton";
import type { ProductOpt } from "@/lib/types";
import { catatStok } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const jenisInfo = {
  TERIMA: "Barang masuk dari supplier. Menambah stok.",
  MUTASI: "Pindah barang antara gudang dan toko. Total stok tetap.",
  OPNAME: "Samakan stok sistem dengan hitungan fisik.",
} as const;

export default function StokForm({
  products,
  defaultTanggal,
}: {
  products: ProductOpt[];
  defaultTanggal: string;
}) {
  const [jenis, setJenis] = useState<keyof typeof jenisInfo>("TERIMA");
  const [barangBaru, setBarangBaru] = useState(false);
  const [dokumenBusy, setDokumenBusy] = useState(false);
  const dokumenBusyRef = useRef(false);

  function aturDokumenBusy(busy: boolean) {
    dokumenBusyRef.current = busy;
    setDokumenBusy(busy);
  }

  function ubahJenis(v: string) {
    const next = v as keyof typeof jenisInfo;
    setJenis(next);
    if (next !== "TERIMA") setBarangBaru(false);
  }

  return (
    <form
      action={catatStok}
      className="grid max-w-3xl gap-4 sm:grid-cols-6"
      onSubmit={(e) => {
        if (dokumenBusyRef.current) e.preventDefault();
      }}
    >
      <div className="sm:col-span-6 space-y-2">
        <Label htmlFor="jenis">Jenis catatan</Label>
        <Select name="jenis" value={jenis} onValueChange={ubahJenis}>
          <SelectTrigger id="jenis">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TERIMA">Terima barang</SelectItem>
            <SelectItem value="MUTASI">Pindah gudang dan toko</SelectItem>
            <SelectItem value="OPNAME">Opname (koreksi hitungan fisik)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-redup">{jenisInfo[jenis]}</p>
      </div>

      <div className="sm:col-span-6 space-y-2">
        <Label htmlFor={barangBaru ? "nama_barang" : "product_id"}>Barang</Label>
        {!barangBaru && <ProductSelect inputId="product_id" name="product_id" options={products} />}
        {jenis === "TERIMA" && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="barang_baru"
              value="1"
              checked={barangBaru}
              onChange={(e) => setBarangBaru(e.target.checked)}
              className="size-4 accent-merah"
            />
            Barang baru — belum ada di database
          </label>
        )}
        {barangBaru && (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nama_barang">Nama barang baru</Label>
                <Input
                  id="nama_barang"
                  name="nama_barang"
                  required={barangBaru}
                  placeholder="Contoh: Beras Premium 5 kg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku_baru">SKU / barcode</Label>
                <Input id="sku_baru" name="sku_baru" placeholder="Opsional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gramasi_baru">Gramasi</Label>
                <Input id="gramasi_baru" name="gramasi_baru" placeholder="Contoh: 5 kg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_baru">Supplier</Label>
                <Input id="supplier_baru" name="supplier_baru" placeholder="Opsional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pcs_per_karton_baru">Isi per karton</Label>
                <Input
                  id="pcs_per_karton_baru"
                  name="pcs_per_karton_baru"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="harga_beli_baru">Harga beli (Rp)</Label>
                <Input id="harga_beli_baru" name="harga_beli_baru" type="number" min={0} step="any" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="harga_jual_baru">Harga jual (Rp)</Label>
                <Input id="harga_jual_baru" name="harga_jual_baru" type="number" min={0} step="any" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stok_min_baru">Batas stok menipis</Label>
                <Input
                  id="stok_min_baru"
                  name="stok_min_baru"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={0}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                <input type="checkbox" name="subsidi_baru" value="1" className="size-4 accent-merah" />
                Barang subsidi
              </label>
            </div>
            <p className="mt-2 text-xs text-redup">
              Barang dengan nama mengandung NPK, Urea, LPG, SPHP, atau Minyak Kita otomatis
              ditandai subsidi. Barang baru dibuat otomatis, lalu qty penerimaan langsung
              menambah stok.
            </p>
          </div>
        )}
      </div>

      <div className="sm:col-span-3 space-y-2">
        <Label htmlFor="tanggal">
          {jenis === "TERIMA" ? "Tanggal penerimaan" : "Tanggal catat"}
        </Label>
        <Input
          id="tanggal"
          name="tanggal"
          type="datetime-local"
          defaultValue={defaultTanggal}
          required
        />
        <p className="text-xs text-redup">
          Tanggal dan jam {jenis === "TERIMA" ? "barang diterima" : "catatan"} (WIB).
        </p>
      </div>
      <div className="sm:col-span-3 space-y-2">
        <Label htmlFor="qty">{jenis === "OPNAME" ? "Stok fisik (pcs)" : "Qty (pcs)"}</Label>
        <Input id="qty" name="qty" type="number" min={jenis === "OPNAME" ? 0 : 1} step={1} required />
      </div>

      {jenis === "MUTASI" ? (
        <div className="sm:col-span-6 space-y-2">
          <Label htmlFor="arah">Arah</Label>
          <Select name="arah" defaultValue="GUDANG_TOKO">
            <SelectTrigger id="arah">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GUDANG_TOKO">Gudang ke toko</SelectItem>
              <SelectItem value="TOKO_GUDANG">Toko ke gudang</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className={jenis === "TERIMA" ? "sm:col-span-3 space-y-2" : "sm:col-span-6 space-y-2"}>
          <Label htmlFor="lokasi">{jenis === "TERIMA" ? "Masuk ke" : "Lokasi"}</Label>
          <Select name="lokasi" defaultValue="GUDANG">
            <SelectTrigger id="lokasi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GUDANG">Gudang</SelectItem>
              <SelectItem value="TOKO">Toko</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {jenis === "TERIMA" && (
        <div className="sm:col-span-3 space-y-2">
          <Label htmlFor="expired">Tanggal expired</Label>
          <Input id="expired" name="expired" type="date" />
          <p className="text-xs text-redup">Opsional. Dipakai untuk peringatan expired.</p>
        </div>
      )}

      <div className="sm:col-span-6 space-y-2">
        <Label htmlFor="keterangan">Keterangan</Label>
        <Input id="keterangan" name="keterangan" placeholder="Nomor STB/surat jalan, nama supplier, atau catatan opname" />
      </div>
      <div className="sm:col-span-6">
        <DokumenStok onBusyChange={aturDokumenBusy} />
      </div>
      <div className="sm:col-span-6 space-y-2">
        {dokumenBusy && (
          <p className="text-xs font-semibold text-kuning">
            Tunggu unggahan dokumen selesai...
          </p>
        )}
        <SubmitButton disabled={dokumenBusy}>Simpan catatan</SubmitButton>
      </div>
    </form>
  );
}
