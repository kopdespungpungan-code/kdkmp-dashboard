"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ubah error Supabase menjadi kode pendek yang aman ditampilkan di URL.
 * Tanpa ini semua kegagalan tampil sebagai "email atau kata sandi salah",
 * padahal bisa jadi user belum dibuat atau email belum dikonfirmasi.
 */
function kodeError(error: { code?: string | null; message?: string | null }): string {
  const code = (error.code ?? "").toLowerCase();
  const pesan = (error.message ?? "").toLowerCase();

  if (code === "email_not_confirmed" || pesan.includes("email not confirmed")) return "belum_konfirmasi";
  if (code === "user_not_found" || pesan.includes("user not found")) return "tidak_ada";
  if (code === "invalid_credentials" || pesan.includes("invalid login credentials")) return "salah";
  if (
    code === "invalid_api_key" ||
    pesan.includes("invalid api key") ||
    pesan.includes("no api key") ||
    pesan.includes("jwt")
  ) {
    return "env";
  }
  if (pesan.includes("failed to fetch") || pesan.includes("fetch failed") || pesan.includes("enotfound")) {
    return "jaringan";
  }
  if (code === "over_email_send_rate_limit" || pesan.includes("rate limit")) return "batas";
  return "lain";
}

export async function login(formData: FormData) {
  // Cek konfigurasi lebih dulu supaya pesannya jelas, bukan "salah password".
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login?e=env");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });
    if (error) redirect(`/login?e=${kodeError(error)}`);
  } catch (e) {
    // redirect() melempar error khusus Next; teruskan apa adanya.
    if (e && typeof e === "object" && "digest" in e) throw e;
    redirect("/login?e=jaringan");
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
