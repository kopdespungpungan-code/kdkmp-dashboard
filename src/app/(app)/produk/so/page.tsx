import { createClient } from "@/lib/supabase/server";
import SoProdukClient, { type ProdukOpt } from "./SoProdukClient";

export const dynamic = "force-dynamic";

export default async function SoProdukPage() {
  const sb = await createClient();

  const { data } = await sb
    .from("products")
    .select("id, item, sku, gramasi, stok_toko, expired_terdekat")
    .eq("aktif", true)
    .order("item")
    .limit(5000);

  const produk: ProdukOpt[] = (data ?? []).map((p) => ({
    id: Number(p.id),
    item: p.item,
    sku: p.sku ?? null,
    gramasi: p.gramasi ?? null,
    stok_toko: Number(p.stok_toko ?? 0),
    expired_terdekat: p.expired_terdekat ?? null,
  }));

  return <SoProdukClient produk={produk} />;
}
