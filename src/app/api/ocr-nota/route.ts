import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const PROMPT = `Gambar-gambar ini adalah halaman PDF berisi nota/struk penjualan. Baca SEMUA nota yang terlihat di setiap gambar (satu gambar bisa berisi lebih dari satu nota). Balas HANYA JSON array valid tanpa teks lain, satu objek per nota, format:
[{"invoice_no": string|null, "tanggal": "YYYY-MM-DD"|null, "kasir": string|null,
  "items": [{"nama": string, "qty": number, "harga": number}], "total": number|null}]
Angka tanpa titik/koma pemisah ribuan. Jika tidak terbaca, isi null.`;

// Membaca balasan biasa (JSON) maupun streaming (SSE: "data: {...}")
function extractContent(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("data:")) {
    return JSON.parse(t).choices?.[0]?.message?.content ?? "";
  }
  let out = "";
  for (const line of t.split("\n")) {
    const s = line.trim();
    if (!s.startsWith("data:")) continue;
    const payload = s.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const j = JSON.parse(payload);
      const c = j.choices?.[0];
      out += c?.delta?.content ?? c?.message?.content ?? "";
    } catch {}
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

    const base = process.env.OCR_BASE_URL;
    const key = process.env.OCR_API_KEY;
    if (!base || !key)
      return NextResponse.json(
        { error: "OCR_BASE_URL / OCR_API_KEY belum terbaca. Cek .env.local lalu restart server." },
        { status: 500 }
      );

    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0)
      return NextResponse.json({ error: "Tidak ada gambar" }, { status: 400 });

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: process.env.OCR_MODEL ?? "newgrafity",
        temperature: 0,
        stream: false,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              ...images.map((url: string) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
      }),
    });

    const raw = await res.text();
    if (!res.ok)
      return NextResponse.json(
        { error: `Model error ${res.status}: ${raw.slice(0, 300)}` },
        { status: 502 }
      );

    const text = extractContent(raw);
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