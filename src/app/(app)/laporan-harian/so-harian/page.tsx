import { createClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/format";
import SoHarianClient from "./SoHarianClient";

export const dynamic = "force-dynamic";

export default async function SoHarianPage() {
  const sb = await createClient();
  const today = todayWIB();

  const { data: products, error } = await sb
    .from("products")
    .select("id, sku, item, gramasi, stok_toko, stok_gudang, expired_terdekat, stok_min")
    .eq("aktif", true)
    .order("item");

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-6">
        <div className="rounded border border-merah/40 bg-merah-muda p-6 text-sm text-merah-tua max-w-md w-full">
          Data stok belum bisa dimuat: {error.message}.
        </div>
      </div>
    );
  }

  const rows = (products ?? []).map((p) => ({
    id: p.id,
    sku: p.sku ?? "-",
    item: p.item,
    gramasi: p.gramasi ?? "-",
    stok_toko: Number(p.stok_toko ?? 0),
    stok_gudang: Number(p.stok_gudang ?? 0),
    expired_terdekat: p.expired_terdekat ?? null,
    stok_min: p.stok_min ?? null,
    stok_real: "",
  }));

  return <SoHarianClient today={today} rows={rows} />;
}
