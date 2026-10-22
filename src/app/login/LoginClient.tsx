"use client";

import { motion } from "framer-motion";
import { login } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PESAN: Record<string, { judul: string; saran?: string }> = {
  salah: {
    judul: "Email atau kata sandi tidak cocok.",
    saran:
      "Kalau akun ini belum pernah dibuat, tambahkan dulu di Supabase → Authentication → Users → Add user (centang Auto Confirm User).",
  },
  belum_konfirmasi: {
    judul: "Email akun ini belum dikonfirmasi.",
    saran: "Buka Supabase → Authentication → Users, pilih user tersebut, lalu Confirm email.",
  },
  tidak_ada: {
    judul: "Akun dengan email ini belum terdaftar.",
    saran: "Buat user-nya di Supabase → Authentication → Users → Add user.",
  },
  env: {
    judul: "Server belum terhubung ke Supabase.",
    saran:
      "Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel (Settings → Environment Variables), lalu Redeploy.",
  },
  jaringan: {
    judul: "Server tidak bisa menghubungi Supabase.",
    saran: "Periksa NEXT_PUBLIC_SUPABASE_URL — pastikan tidak ada salah ketik atau spasi.",
  },
  batas: {
    judul: "Terlalu banyak percobaan masuk.",
    saran: "Tunggu sekitar satu menit, lalu coba lagi.",
  },
  lain: {
    judul: "Gagal masuk.",
    saran: "Buka /api/health di browser untuk melihat kondisi koneksi server.",
  },
};

export default function LoginClient({ error }: { error?: string }) {
  const pesan = error ? (PESAN[error] ?? PESAN.lain) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid min-h-screen lg:grid-cols-2"
    >
      <div className="flex flex-col justify-between bg-primary p-8 text-white lg:p-12">
        <div className="flex items-center gap-2">
          <img src="/assets/logo-kopdes.jpg" alt="Logo KDKMP" className="h-6 w-6 rounded" />
          <p className="font-display text-sm font-semibold">Koperasi Desa Merah Putih</p>
        </div>
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-none sm:text-6xl">Toko<br />Pungpungan</h1>
          <p className="mt-4 max-w-sm text-white/85">Catat nota, pantau stok, dan kirim retur dari satu tempat.</p>
        </div>
        <p className="text-xs text-white/70">Kalitidu, Bojonegoro</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.form
          action={login}
          className="w-full max-w-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="mb-5 text-2xl font-bold">Masuk</h2>
          {pesan && (
            <div
              role="alert"
              className="mb-4 rounded border border-primary/40 bg-accent px-3 py-2 text-sm text-accent-foreground"
            >
              <p className="font-semibold">{pesan.judul}</p>
              {pesan.saran && <p className="mt-1 text-xs leading-relaxed">{pesan.saran}</p>}
              <p className="mt-1 text-xs leading-relaxed opacity-80">
                Cek koneksi server:{" "}
                <a href="/api/health" className="underline" target="_blank" rel="noreferrer">
                  /api/health
                </a>
              </p>
            </div>
          )}
          <div className="space-y-2 mb-4">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2 mb-6">
            <Label htmlFor="password">Kata sandi</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <SubmitButton pendingText="Masuk...">Masuk</SubmitButton>
        </motion.form>
      </div>
    </motion.div>
  );
}
