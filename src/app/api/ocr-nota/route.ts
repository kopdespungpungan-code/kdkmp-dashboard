import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOcrConfig, isOpenRouter, ocrHeaders, reasoningBody } from "@/lib/ocr-config";
import { extractOcrContent } from "@/lib/ocr-response";

export const maxDuration = 60;

const PROMPT = `Gambar-gambar ini adalah halaman PDF berisi nota/struk penjualan. Baca SEMUA nota yang terlihat di setiap gambar (satu gambar bisa berisi lebih dari satu nota). Balas HANYA JSON array valid tanpa teks lain, satu objek per nota, format:
[{"invoice_no": string|null, "tanggal": "YYYY-MM-DD"|null, "jam": "HH:MM"|null, "kasir": string|null,
  "items": [{"nama": string, "qty": number, "harga": number}], "total": number|null}]
"tanggal" dan "jam" diambil dari waktu yang tercetak pada nota (jam 24 jam, tanpa detik). "total" adalah total akhir yang dibayar. Angka tanpa titik/koma pemisah ribuan. Jika tidak terbaca, isi null.`;

export async function POST(req: Request) {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

    // Konfigurasi dibaca dari menu Pengaturan (tabel app_settings).
    // Kalau tabel belum dibuat, helper otomatis memakai env lama.
    const cfg = await getOcrConfig(sb);
    const { baseUrl, apiKey, model, reasoning } = cfg;

    if (!baseUrl || !apiKey)
      return NextResponse.json(
        {
          error:
            "OCR belum dikonfigurasi. Buka menu Pengaturan dan isi Base URL + API key OCR.",
        },
        { status: 500 }
      );

    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0)
      return NextResponse.json({ error: "Tidak ada gambar" }, { status: 400 });

    const body: Record<string, unknown> = {
      model,
      temperature: 0,
      stream: false,
      // Cegah output liar dan biaya membengkak kalau satu halaman berisi banyak nota.
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            ...images.map((url: string) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
    };
    if (isOpenRouter(baseUrl)) {
      const r = reasoningBody(reasoning);
      if (r) body.reasoning = r;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: ocrHeaders(baseUrl, apiKey),
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (!res.ok)
      return NextResponse.json(
        { error: `Model error ${res.status}: ${raw.slice(0, 300)}` },
        { status: 502 }
      );

    const text = extractOcrContent(raw);
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      return NextResponse.json(Array.isArray(parsed) ? parsed : [parsed]);
    } catch {
      return NextResponse.json({ error: "Hasil OCR bukan JSON valid", raw: text }, { status: 422 });
    }
  } catch (e: any) {
    console.error("[ocr-nota]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}