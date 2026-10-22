import { NextResponse } from "next/server";

export const runtime = "nodejs";
// OCR gambar bisa lama; naikkan batas waktu fungsi di Vercel.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Tidak ada gambar" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key tidak ditemukan" }, { status: 500 });
    }

    const prompt = `Analisis gambar/dokumen ini dan ekstrak informasi berikut dalam format JSON:
{
  "jenis_dokumen": "absensi | laporan | struk | lainnya",
  "tanggal": "YYYY-MM-DD",
  "karyawan": [{"nama": "...", "jabatan": "...", "status": "hadir|izin|sakit|alpha", "jam_masuk": "HH:MM", "jam_keluar": "HH:MM"}],
  "ringkasan": "ringkasan singkat isi dokumen",
  "catatan": "catatan tambahan jika ada"
}
Jika tidak bisa membaca, kembalikan {"error": "tidak bisa dibaca"}.`;

    const parts = images.map((img: string) => ({
      inlineData: { mimeType: "image/jpeg", data: img.replace(/^data:image\/\w+;base64,/, "") },
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...parts] }],
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

    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
