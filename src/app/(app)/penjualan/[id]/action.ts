"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function hapusNota(formData: FormData) {
  const id = Number(formData.get("id"));
  const balik = (m: string): never =>
    redirect(`/penjualan/${id}?error=${encodeURIComponent(m)}`);

  if (!Number.isInteger(id)) redirect("/penjualan");

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await sb.from("sales").delete().eq("id", id).select("id");
  if (error) balik(`Nota gagal dihapus: ${error.message}`);
  if (!data || data.length === 0) balik("Nota tidak terhapus. Kemungkinan tidak ada izin hapus (RLS).");

  revalidatePath("/", "layout");
  redirect("/penjualan");
}