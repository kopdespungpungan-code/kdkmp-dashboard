import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { kkValid, mingguBerjalan, rapikanKK } from "@/lib/subsidi";

export const dynamic = "force-dynamic";

function invoiceDariRelasi(rel: unknown): string | null {
  if (Array.isArray(rel)) {
    const first = rel[0] as { invoice_no?: string } | undefined;
    return first?.invoice_no ?? null;
  }
  return (rel as { invoice_no?: string } | null | undefined)?.invoice_no ?? null;
}

/**
 * Cek cepat sebelum nota disimpan: apakah No. KK sudah punya transaksi
 * subsidi di minggu berjalan? Pengecekan final tetap dilakukan di server
 * action + index unik database.
 */
export async function GET(req: Request) {
  const kk = rapikanKK(new URL(req.url).searchParams.get("kk") ?? "");
  if (!kkValid(kk)) {
    return NextResponse.json({ ok: false, pesan: "No. KK harus 16 digit angka." }, { status: 400 });
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, pesan: "Sesi berakhir. Muat ulang halaman lalu login lagi." }, { status: 401 });
  }

  const { mulai, selesai } = mingguBerjalan();
  const [salesCek, kkCek] = await Promise.all([
    sb
      .from("sales")
      .select("invoice_no")
      .eq("no_kk", kk)
      .eq("subsidi", true)
      .gte("tanggal", mulai)
      .lt("tanggal", selesai)
      .limit(1)
      .maybeSingle(),
    sb
      .from("sale_kk")
      .select("no_kk, sales(invoice_no)")
      .eq("no_kk", kk)
      .gte("tanggal", mulai)
      .lt("tanggal", selesai)
      .limit(1)
      .maybeSingle(),
  ]);

  if (salesCek.error) {
    const pesan =
      /no_kk|subsidi/i.test(salesCek.error.message) &&
      /(column|schema cache|could not find|does not exist)/i.test(salesCek.error.message)
        ? "Fitur subsidi belum aktif di database. Jalankan supabase/subsidi.sql."
        : salesCek.error.message;
    return NextResponse.json({ ok: false, pesan }, { status: 500 });
  }

  if (kkCek.error) {
    const pesan = kkCek.error.message.toLowerCase();
    if (/sale_kk/.test(pesan) && /(does not exist|schema cache|could not find|relation)/.test(pesan)) {
      return NextResponse.json(
        {
          ok: false,
          pesan:
            "Fitur KK bulk/per barang belum aktif di database. Jalankan supabase/subsidi_per_item.sql.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: false, pesan: kkCek.error.message }, { status: 500 });
  }

  if (salesCek.data) {
    return NextResponse.json({
      ok: false,
      invoice_no: salesCek.data.invoice_no,
      pesan: `KK ${kk} sudah transaksi subsidi minggu ini (${salesCek.data.invoice_no}). Batasnya 1x per minggu per KK.`,
    });
  }

  const bentrokItem = kkCek.data as unknown as {
    no_kk?: string;
    sales?: { invoice_no?: string } | { invoice_no?: string }[] | null;
  } | null;
  if (bentrokItem) {
    const invoice = invoiceDariRelasi(bentrokItem.sales) ?? "-";
    return NextResponse.json({
      ok: false,
      invoice_no: invoice,
      pesan: `KK ${kk} sudah transaksi subsidi minggu ini (${invoice}). Batasnya 1x per minggu per KK.`,
    });
  }

  return NextResponse.json({ ok: true });
}
