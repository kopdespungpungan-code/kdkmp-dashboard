import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BUCKET_STOK,
  MAKS_UKURAN_DOKUMEN,
  ekstensiDokumen,
  pathDokumenValid,
  tipeDokumenValid,
  type JenisDokumenStok,
} from "@/lib/stok-dokumen";

export const maxDuration = 30;

function pesanError(err: { message?: string } | null, cadangan: string): string {
  const msg = err?.message ?? "";
  if (/bucket.*not found|not found.*bucket/i.test(msg)) {
    return "Bucket Storage 'stok' belum ada. Jalankan supabase/stok_dokumen.sql atau buat bucket 'stok' (private) di Supabase Storage.";
  }
  if (/row-level security|permission denied/i.test(msg)) {
    return "Akses Storage ditolak. Pastikan policy bucket 'stok' dari supabase/stok_dokumen.sql sudah dijalankan.";
  }
  if (/mime type|content type/i.test(msg)) {
    return "Tipe file tidak didukung. Dokumentasi: JPG/PNG/WebP. STB: PDF/JPG/PNG/WebP.";
  }
  if (/too large|exceeded.*size|payload/i.test(msg)) {
    return "Ukuran file melebihi batas 4 MB.";
  }
  return msg || cadangan;
}

export async function POST(req: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const form = await req.formData();
    const jenis = String(form.get("jenis") ?? "");
    if (jenis !== "dokumentasi" && jenis !== "stb") {
      return NextResponse.json({ error: "Jenis dokumen tidak valid." }, { status: 400 });
    }
    const jenisDokumen = jenis as JenisDokumenStok;

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }
    if (!tipeDokumenValid(jenisDokumen, file.type)) {
      return NextResponse.json(
        {
          error:
            jenisDokumen === "dokumentasi"
              ? "Dokumentasi harus berupa foto JPG, PNG, atau WebP."
              : "STB harus berupa PDF, JPG, PNG, atau WebP.",
        },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > MAKS_UKURAN_DOKUMEN) {
      return NextResponse.json({ error: "Ukuran file maksimal 4 MB." }, { status: 400 });
    }

    const path = `${jenisDokumen}/${crypto.randomUUID()}.${ekstensiDokumen(file.type)}`;
    const { error } = await sb.storage.from(BUCKET_STOK).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      return NextResponse.json(
        { error: pesanError(error, "Gagal mengunggah dokumen.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, path });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal mengunggah dokumen." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const path = new URL(req.url).searchParams.get("path") ?? "";
    const jenis = path.startsWith("dokumentasi/")
      ? "dokumentasi"
      : path.startsWith("stb/")
        ? "stb"
        : null;
    if (!jenis || !pathDokumenValid(path, jenis)) {
      return NextResponse.json({ error: "Path dokumen tidak valid." }, { status: 400 });
    }

    const { error } = await sb.storage.from(BUCKET_STOK).remove([path]);
    if (error) {
      return NextResponse.json(
        { error: pesanError(error, "Gagal menghapus dokumen.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal menghapus dokumen." },
      { status: 500 },
    );
  }
}
