"use client";
import { useState } from "react";
import ProductSelect from "@/components/ProductSelect";
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

export default function StokForm({ products }: { products: ProductOpt[] }) {
  const [jenis, setJenis] = useState<keyof typeof jenisInfo>("TERIMA");

  return (
    <form action={catatStok} className="grid max-w-3xl gap-4 sm:grid-cols-6">
      <div className="sm:col-span-6 space-y-2">
        <Label htmlFor="jenis">Jenis catatan</Label>
        <Select name="jenis" value={jenis} onValueChange={(v) => setJenis(v as keyof typeof jenisInfo)}>
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
        <Label>Barang</Label>
        <ProductSelect name="product_id" options={products} />
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="qty">{jenis === "OPNAME" ? "Stok fisik (pcs)" : "Qty (pcs)"}</Label>
        <Input id="qty" name="qty" type="number" min={jenis === "OPNAME" ? 0 : 1} step={1} required />
      </div>
      {jenis === "MUTASI" ? (
        <div className="sm:col-span-4 space-y-2">
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
        <div className="sm:col-span-2 space-y-2">
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
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="expired">Tanggal expired</Label>
          <Input id="expired" name="expired" type="date" />
          <p className="text-xs text-redup">Opsional. Dipakai untuk peringatan expired.</p>
        </div>
      )}
      <div className="sm:col-span-6 space-y-2">
        <Label htmlFor="keterangan">Keterangan</Label>
        <Input id="keterangan" name="keterangan" placeholder="Nomor surat jalan, nama supplier, atau catatan opname" />
      </div>
      <div className="sm:col-span-6">
        <SubmitButton>Simpan catatan</SubmitButton>
      </div>
    </form>
  );
}
