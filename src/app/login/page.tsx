import { login } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between bg-merah p-8 text-white lg:p-12">
        <p className="font-display text-sm font-semibold">Koperasi Desa Merah Putih</p>
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-none sm:text-6xl">Toko<br />Pungpungan</h1>
          <p className="mt-4 max-w-sm text-white/85">Catat nota, pantau stok, dan kirim retur dari satu tempat.</p>
        </div>
        <p className="text-xs text-white/70">Kalitidu, Bojonegoro</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form action={login} className="w-full max-w-sm">
          <h2 className="mb-5 text-2xl font-bold">Masuk</h2>
          {error && (
            <p role="alert" className="mb-4 rounded border border-merah/40 bg-merah-muda px-3 py-2 text-sm text-merah-tua">
              Email atau kata sandi salah. Periksa lalu coba lagi.
            </p>
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
        </form>
      </div>
    </div>
  );
}
