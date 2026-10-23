import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOCS_SUMMARY } from "@/lib/docs-content";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM_PROMPT = `Anda adalah asisten dokumentasi untuk aplikasi "Dashboard Toko KDKMP Pungpungan".
Tugas Anda: menjawab pertanyaan pengguna dengan RINGKAS, jelas, dan dalam Bahasa Indonesia, berdasarkan dokumentasi berikut.
Jangan mengarang fitur yang tidak ada di dokumentasi. Jika tidak tahu, katakan "Informasi ini tidak ada di dokumentasi."
Jawab maksimal 3-5 kalimat atau bullet point. Hindari penjelasan panjang.

=== DOKUMENTASI ===
${DOCS_SUMMARY}
=== AKHIR DOKUMENTASI ===`;

export async function POST(req: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

    const { question } = (await req.json()) as { question?: string };
    const q = (question ?? "").trim();
    if (!q) return NextResponse.json({ error: "Pertanyaan kosong" }, { status: 400 });
    if (q.length > 500) return NextResponse.json({ error: "Pertanyaan terlalu panjang (maks 500 karakter)" }, { status: 400 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = "https://openrouter.ai/api/v1";
    const model = "google/gemini-2.0-flash-001"; // murah & cepat

    if (!apiKey) {
      // Fallback ke OCR config lama jika ada
      const { getOcrConfig } = await import("@/lib/ocr-config");
      const cfg = await getOcrConfig(sb);
      if (!cfg.apiKey) {
        return NextResponse.json({ error: "AI helper belum dikonfigurasi (API key kosong)." }, { status: 500 });
      }
      // pakai config lama
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://kdkmp-pungpungan.local",
        "X-Title": "KDKMP Docs AI Helper",
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: q },
        ],
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: `Model error ${res.status}: ${raw.slice(0, 200)}` }, { status: 502 });
    }

    let answer = "";
    try {
      const json = JSON.parse(raw);
      answer = json?.choices?.[0]?.message?.content ?? "";
    } catch {
      answer = raw.slice(0, 500);
    }

    return NextResponse.json({ answer: answer.trim() });
  } catch (e: any) {
    console.error("[docs-ai]", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
