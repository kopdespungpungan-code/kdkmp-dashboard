"use client";
import ProductSelect from "@/components/ProductSelect";
import SubmitButton from "@/components/SubmitButton";
import type { ProductOpt } from "@/lib/types";
import { buatRetur } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReturForm({ products, today }: { products: ProductOpt[]; today: string }) {
  return (
    <form action={buatRetur} className="grid max-w-3xl gap-4 sm:grid-cols-6">
      <div className="sm:col-span-6 space-y-2">
        <Label>Barang</Label>
        <ProductSelect name="product_id" options={products} />
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="qty_pcs">Qty (pcs)</Label>
        <Input id="qty_pcs" name="qty_pcs" type="number" min={1} step={1} required />
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="tipe">Jenis retur</Label>
        <Select name="tipe" defaultValue="SUPPLIER">
          <SelectTrigger id="tipe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SUPPLIER">Ke supplier</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="RUSAK">Rusak</SelectItem>
            <SelectItem value="CUSTOMER">Dari pembeli</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-redup">Dari pembeli menambah stok toko. Jenis lain mengurangi.</p>
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="tanggal">Tanggal</Label>
        <Input id="tanggal" name="tanggal" type="date" defaultValue={today} required />
      </div>
      <div className="sm:col-span-6 space-y-2">
        <Label htmlFor="keterangan">Keterangan</Label>
        <Input id="keterangan" name="keterangan" placeholder="Alasan, tanggal expired, atau status verifikasi" />
      </div>
      <div className="sm:col-span-6">
        <SubmitButton>Simpan retur</SubmitButton>
      </div>
    </form>
  );
}
