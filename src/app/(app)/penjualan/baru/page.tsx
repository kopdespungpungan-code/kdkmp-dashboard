import { createClient } from "@/lib/supabase/server";
import { Alert, LinkButton, PageHeader } from "@/components/ui";
import type { ProductOpt } from "@/lib/types";
import NotaForm from "./NotaForm";

export const dynamic = "force-dynamic";

export default async function NotaBaru({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from("products").select("id, item, harga_jual, stok_toko").eq("aktif", true).order("item").limit(5000);

  return (
    <>
      <PageHeader title="Nota baru" sub="Stok toko berkurang otomatis setelah nota disimpan." action={<LinkButton href="/penjualan">Batal</LinkButton>} />
      {error && <Alert>{error}</Alert>}
      <NotaForm products={(data ?? []) as ProductOpt[]} />
    </>
  );
}
