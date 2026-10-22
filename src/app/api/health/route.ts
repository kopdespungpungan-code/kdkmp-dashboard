import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Diagnosa cepat setelah deploy: apakah server sudah terhubung ke Supabase?
 * Sengaja tidak menampilkan key sama sekali, hanya status dan nama host.
 *
 * Buka https://<domain>/api/health
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const hasil: Record<string, unknown> = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(url),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anon),
    },
  };

  if (!url || !anon) {
    return NextResponse.json(
      {
        ...hasil,
        status: "env-belum-diisi",
        pesan:
          "Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel (Settings → Environment Variables), lalu Redeploy.",
      },
      { status: 503 },
    );
  }

  // Tampilkan host saja (project ref memang publik di browser, key tidak).
  try {
    hasil.host = new URL(url).host;
  } catch {
    return NextResponse.json(
      {
        ...hasil,
        status: "url-tidak-valid",
        pesan: "NEXT_PUBLIC_SUPABASE_URL bukan URL yang valid. Contoh: https://xxxx.supabase.co",
      },
      { status: 503 },
    );
  }

  const cek = async (path: string) => {
    try {
      const r = await fetch(`${url.replace(/\/+$/, "")}${path}`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        cache: "no-store",
      });
      const teks = (await r.text()).slice(0, 200);
      return { ok: r.ok, statusCode: r.status, cuplikan: teks };
    } catch (e) {
      return { ok: false, statusCode: 0, cuplikan: e instanceof Error ? e.message : "gagal terhubung" };
    }
  };

  const [auth, rest] = await Promise.all([
    cek("/auth/v1/health"),
    // `/rest/v1/` (root) hanya untuk service_role, jadi pakai tabel nyata.
    cek("/rest/v1/products?select=id&limit=1"),
  ]);

  const status = auth.ok && rest.ok ? "ok" : "bermasalah";

  return NextResponse.json(
    {
      ...hasil,
      status,
      auth,
      database: rest,
      pesan:
        status === "ok"
          ? "Server terhubung ke Supabase. Kalau tetap tidak bisa login, user-nya belum ada atau belum dikonfirmasi (Supabase → Authentication → Users)."
          : auth.statusCode === 401 || rest.statusCode === 401
            ? "ANON KEY ditolak Supabase. Ambil ulang anon/public key dari Supabase → Settings → API, lalu perbarui di Vercel."
            : "Server tidak bisa menjangkau Supabase. Periksa URL project.",
    },
    { status: 200 },
  );
}
