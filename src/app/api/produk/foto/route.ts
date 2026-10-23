import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const BUCKET = "produk";
const MAX_UKURAN = 5 * 1024 * 1024;
const TIPE_DIIZINKAN = new Set(["image/jpeg", "image/png", "image/webp"]);

function pathDariUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const dasar = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (dasar && u.origin !== new URL(dasar).origin) return null;

    const awalan = `/storage/v1/object/public/${BUCKET}/`;
    if (!u.pathname.startsWith(awalan)) return null;
    return decodeURIComponent(u.pathname.slice(awalan.length));
  } catch {
    return null;
  }
}

function pesanError(err: { message?: string } | null, cadangan: string): string {
  const msg = err?.message ?? "";
  if (/foto_url/i.test(msg) && /(column|schema|could not find|does not exist)/i.test(msg)) {
    return "Kolom foto_url belum ada. Jalankan supabase/produk_foto.sql di Supabase SQL Editor.";
  }
  if (/bucket.*not found|not found.*bucket/i.test(msg)) {
    return "Bucket Storage 'produk' belum ada. Jalankan supabase/produk_foto.sql atau buat bucket 'produk' (public) di Supabase Storage.";
  }
  if (/row-level security|permission denied/i.test(msg)) {
    return "Akses Storage ditolak. Pastikan policy bucket 'produk' dari supabase/produk_foto.sql sudah dijalankan.";
  }
  if (/mime type|content type/i.test(msg)) {
    return "Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.";
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
    const id = Number(form.get("product_id"));
    const file = form.get("file");

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Produk tidak valid." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File foto tidak ditemukan." }, { status: 400 });
    }
    if (!TIPE_DIIZINKAN.has(file.type)) {
      return NextResponse.json({ error: "Gunakan foto JPG, PNG, atau WebP." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_UKURAN) {
      return NextResponse.json({ error: "Ukuran foto maksimal 5 MB." }, { status: 400 });
    }

    const { data: produk, error: errProduk } = await sb
      .from("products")
      .select("id, foto_url")
      .eq("id", id)
      .maybeSingle();

    if (errProduk) {
      return NextResponse.json(
        { error: pesanError(errProduk, "Gagal membaca produk.") },
        { status: 500 },
      );
    }
    if (!produk) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/${crypto.randomUUID()}.${ext}`;

    const { error: errUpload } = await sb.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (errUpload) {
      return NextResponse.json(
        { error: pesanError(errUpload, "Gagal mengunggah foto.") },
        { status: 500 },
      );
    }

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    const { error: errUpdate } = await sb.from("products").update({ foto_url: url }).eq("id", id);
    if (errUpdate) {
      await sb.storage.from(BUCKET).remove([path]);
      return NextResponse.json(
        { error: pesanError(errUpdate, "Gagal menyimpan foto.") },
        { status: 500 },
      );
    }

    // Hapus file lama setelah produk benar-benar menunjuk ke foto baru.
    const lama = pathDariUrl(produk.foto_url);
    if (lama && lama.startsWith(`${id}/`)) await sb.storage.from(BUCKET).remove([lama]);

    revalidatePath("/produk");
    revalidatePath(`/produk/${id}`);

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal mengunggah foto." },
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

    const id = Number(new URL(req.url).searchParams.get("product_id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Produk tidak valid." }, { status: 400 });
    }

    const { data: produk, error: errProduk } = await sb
      .from("products")
      .select("id, foto_url")
      .eq("id", id)
      .maybeSingle();

    if (errProduk) {
      return NextResponse.json(
        { error: pesanError(errProduk, "Gagal membaca produk.") },
        { status: 500 },
      );
    }
    if (!produk) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    const { error: errUpdate } = await sb.from("products").update({ foto_url: null }).eq("id", id);
    if (errUpdate) {
      return NextResponse.json(
        { error: pesanError(errUpdate, "Gagal menghapus foto.") },
        { status: 500 },
      );
    }

    const lama = pathDariUrl(produk.foto_url);
    if (lama && lama.startsWith(`${id}/`)) await sb.storage.from(BUCKET).remove([lama]);

    revalidatePath("/produk");
    revalidatePath(`/produk/${id}`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Gagal menghapus foto." },
      { status: 500 },
    );
  }
}
