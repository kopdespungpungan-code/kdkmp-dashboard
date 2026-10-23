import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { angka } from "@/lib/format";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import FotoProduk from "@/components/FotoProduk";
import SubmitButton from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProduk } from "./actions";
import type { Product } from "@/lib/types";
import { labelLokasi, type PetaLokasi } from "@/lib/lokasi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";

export const dynamic = "force-dynamic";

export default async function EditProduk({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const pid = Number(id);
  if (!Number.isInteger(pid)) notFound();

  const sb = await createClient();
  const { data } = await sb.from("products").select("*").eq("id", pid).maybeSingle();
  if (!data) notFound();
  const p = data as Product;
  const action = updateProduk.bind(null, pid);

  // Lokasi fisik produk: gondola + tingkat, atau "Gudang" bila belum ditempatkan.
  const { data: lokasiData } = await sb
    .from("product_gondola")
    .select("gondola_no, lokasi, tingkat")
    .eq("produk_id", pid);
  const daftarLokasi: PetaLokasi[] = (lokasiData ?? []).map((l) => ({
    gondola_no: l.gondola_no === null ? null : Number(l.gondola_no),
    lokasi: l.lokasi ?? "",
    tingkat: l.tingkat === null ? null : Number(l.tingkat),
  }));
  const teksLokasi =
    daftarLokasi.length === 0
      ? "Gudang (belum ditempatkan di gondola)"
      : daftarLokasi.map(labelLokasi).join(" · ");

  return (
    <>
      <PageHeader title={p.item} sub={`Stok toko ${angka(p.stok_toko)}, gudang ${angka(p.stok_gudang)}. Ubah stok lewat menu Stok.`} action={<LinkButton href="/produk">Kembali</LinkButton>} />
      {error && <Alert>{error}</Alert>}

      <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm">
        <FontAwesomeIcon icon={faLocationDot} className="mt-0.5 text-primary" />
        <div>
          <div className="text-xs text-redup">Lokasi</div>
          <div className="font-semibold">{teksLokasi}</div>
        </div>
      </div>

      <div className="max-w-2xl">
        <FotoProduk produkId={p.id} nama={p.item} awal={p.foto_url ?? null} />
      </div>

      <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="item">Nama barang</Label>
          <Input id="item" name="item" defaultValue={p.item} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU / barcode</Label>
          <Input id="sku" name="sku" defaultValue={p.sku ?? ""} />
          <p className="text-xs text-redup">Boleh kosong. Tidak boleh sama dengan produk lain.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gramasi">Gramasi</Label>
          <Input id="gramasi" name="gramasi" defaultValue={p.gramasi ?? ""} placeholder="250 g" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <Input id="supplier" name="supplier" defaultValue={p.supplier ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pcs_per_karton">Isi per karton (pcs)</Label>
          <Input id="pcs_per_karton" name="pcs_per_karton" type="number" min={1} defaultValue={p.pcs_per_karton ?? 1} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="harga_beli">Harga beli (Rp)</Label>
          <Input id="harga_beli" name="harga_beli" type="number" min={0} step="any" defaultValue={p.harga_beli ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="harga_jual">Harga jual (Rp)</Label>
          <Input id="harga_jual" name="harga_jual" type="number" min={0} step="any" defaultValue={p.harga_jual ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stok_min">Batas stok menipis (pcs)</Label>
          <Input id="stok_min" name="stok_min" type="number" min={0} defaultValue={p.stok_min ?? 0} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
          <input type="checkbox" name="aktif" defaultChecked={p.aktif} className="size-4 accent-merah" />
          Produk aktif dijual
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
          <input type="checkbox" name="subsidi" defaultChecked={p.subsidi} className="size-4 accent-merah" />
          Barang subsidi
        </label>
        <p className="sm:col-span-2 text-xs text-redup">
          Barang subsidi wajib diisi No. KK saat dijual dan dibatasi 1 transaksi per KK per minggu (Senin–Minggu).
        </p>
        <div className="sm:col-span-2">
          <SubmitButton>Simpan perubahan</SubmitButton>
        </div>
      </form>
    </>
  );
}
