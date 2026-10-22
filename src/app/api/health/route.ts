import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Tabel yang wajib ada supaya aplikasi bisa dipakai. */
const TABEL_WAJIB = ["products", "product_gondola", "so_gondola"];

/**
 * Diagnosa cepat setelah deploy: apakah server sudah terhubung ke Supabase,
 * dan apakah skema database sudah lengkap?
 *
 * Sengaja tidak menampilkan key sama sekali, hanya status dan nama host.
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

  const dasar = url.replace(/\/+$/, "");
  const headers = { apikey: anon, Authorization: `Bearer ${anon}` };

  const cek = async (path: string) => {
    try {
      const r = await fetch(`${dasar}${path}`, { headers, cache: "no-store" });
      const teks = (await r.text()).slice(0, 300);
      return { ok: r.ok, statusCode: r.status, cuplikan: teks };
    } catch (e) {
      return { ok: false, statusCode: 0, cuplikan: e instanceof Error ? e.message : "gagal terhubung" };
    }
  };

  // Auth + satu tabel per tabel wajib, dijalankan paralel.
  const [auth, ...tabel] = await Promise.all([
    cek("/auth/v1/health"),
    ...TABEL_WAJIB.map((t) => cek(`/rest/v1/${t}?select=id&limit=1`)),
  ]);

  const skema = Object.fromEntries(
    TABEL_WAJIB.map((nama, i) => [
      nama,
      {
        ok: tabel[i].ok,
        statusCode: tabel[i].statusCode,
        ...(tabel[i].ok ? {} : { cuplikan: tabel[i].cuplikan }),
      },
    ]),
  );

  const tabelHilang = TABEL_WAJIB.filter((_, i) => !tabel[i].ok);
  const keyDitolak = auth.statusCode === 401 || tabel.some((t) => t.statusCode === 401);
  const tidakTerjangkau = auth.statusCode === 0 || tabel.every((t) => t.statusCode === 0);

  let status = "ok";
  let pesan =
    "Server terhubung ke Supabase dan skema database lengkap. Kalau login masih gagal, user-nya belum ada atau belum dikonfirmasi (Supabase → Authentication → Users).";

  if (tidakTerjangkau) {
    status = "tidak-terjangkau";
    pesan = "Server tidak bisa menjangkau Supabase. Periksa NEXT_PUBLIC_SUPABASE_URL (salah ketik/spasi).";
  } else if (keyDitolak) {
    status = "key-ditolak";
    pesan =
      "ANON KEY ditolak Supabase. Ambil ulang anon/public key dari project yang benar (Settings → API), lalu perbarui di Vercel dan Redeploy.";
  } else if (tabelHilang.length > 0) {
    status = "skema-belum-dibuat";
    pesan = `Project Supabase terhubung, tetapi tabel berikut belum ada: ${tabelHilang.join(
      ", ",
    )}. Jalankan file SQL di folder supabase/ pada project ini (lihat README bagian Deploy), lalu Redeploy.`;
  }

  return NextResponse.json(
    {
      ...hasil,
      status,
      auth,
      skema,
      pesan,
    },
    { status: 200 },
  );
}
