import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOcrConfig, isOpenRouter, ocrHeaders, reasoningBody } from "@/lib/ocr-config";
import { extractOcrContent } from "@/lib/ocr-response";

export const runtime = "nodejs";
// OCR gambar bisa lama; naikkan batas waktu fungsi di Vercel.
export const maxDuration = 60;

const PROMPT = `Analisis gambar/dokumen ini dan ekstrak informasi berikut dalam format JSON:
{
  "jenis_dokumen": "absensi | laporan | struk | lainnya",
  "tanggal": "YYYY-MM-DD",
  "karyawan": [{"nama": "...", "jabatan": "...", "status": "hadir|izin|sakit|alpha", "jam_masuk": "HH:MM", "jam_keluar": "HH:MM"}],
  "ringkasan": "ringkasan singkat isi dokumen",
  "catatan": "catatan tambahan jika ada"
}
Jika tidak bisa membaca, kembalikan {"error": "tidak bisa dibaca"}.`;

export async function POST(req: Request) {
  try {
    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Tidak ada gambar" }, { status: 400 });
    }

    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

    // OpenRouter / endpoint kustom dari menu Pengaturan. Kalau belum diisi,
    // pakai Gemini lama supaya fitur absensi tetap jalan.
    const cfg = await getOcrConfig(sb);

    if (cfg.baseUrl && cfg.apiKey) {
      const body: Record<string, unknown> = {
        model: cfg.model,
        temperature: 0,
        stream: false,
        max_tokens: 4096,
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
      if (isOpenRouter(cfg.baseUrl)) {
        const r = reasoningBody(cfg.reasoning);
        if (r) body.reasoning = r;
      }

      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: ocrHeaders(cfg.baseUrl, cfg.apiKey),
        signal: AbortSignal.timeout(55_000),
        body: JSON.stringify(body),
      });

      const raw = await res.text();
      if (!res.ok) {
        return NextResponse.json(
          { error: `Model error ${res.status}: ${raw.slice(0, 300)}` },
          { status: 502 },
        );
      }

      const text = extractOcrContent(raw);
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "Tidak bisa parse hasil OCR", raw: text }, { status: 422 });
      }
      return NextResponse.json(JSON.parse(match[0]));
    }

    // Fallback: Gemini (endpoint lama).
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OCR belum dikonfigurasi. Buka menu Pengaturan untuk mengisi Base URL + API key, atau isi GEMINI_API_KEY.",
        },
        { status: 500 },
      );
    }

    const parts = images.map((img: string) => ({
      inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/\w+;base64,/, "") },
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, ...parts] }],
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini error: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "Tidak bisa parse hasil OCR" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(match[0]));
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
