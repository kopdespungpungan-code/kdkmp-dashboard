"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductPhoto } from "@/components/ProductPhoto";
import { kompresGambar } from "@/lib/kompres-gambar";

export default function FotoProduk({
  produkId,
  nama,
  awal,
}: {
  produkId: number;
  nama: string;
  awal?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(awal || null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    setUrl(awal || null);
  }, [awal]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr(null);
    setPesan(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setErr("Gunakan foto JPG, PNG, atau WebP.");
    }
    if (file.size > 10 * 1024 * 1024) {
      return setErr("Ukuran foto maksimal 10 MB.");
    }

    setBusy(true);
    setPreview(URL.createObjectURL(file));

    try {
      const blob = await kompresGambar(file, { max: 900, quality: 0.8 });
      const fd = new FormData();
      fd.set("product_id", String(produkId));
      fd.set("file", blob, "foto.jpg");

      const res = await fetch("/api/produk/foto", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Gagal mengunggah foto.");

      setUrl(json.url);
      setPesan("Foto tersimpan.");
    } catch (e: any) {
      setErr(e?.message || "Gagal mengunggah foto.");
    } finally {
      setPreview(null);
      setBusy(false);
    }
  }

  async function hapus() {
    if (!window.confirm("Hapus foto produk ini?")) return;
    setBusy(true);
    setErr(null);
    setPesan(null);

    try {
      const res = await fetch(`/api/produk/foto?product_id=${produkId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus foto.");
      setUrl(null);
      setPesan("Foto dihapus.");
    } catch (e: any) {
      setErr(e?.message || "Gagal menghapus foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0">
          <ProductPhoto
            src={preview ?? url}
            alt={`Foto ${nama}`}
            className="h-28 w-28 rounded-xl border border-border"
            iconClassName="text-3xl"
          />
          {busy && (
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-background/70">
              <span className="fas fa-circle-notch fa-spin text-primary" aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Foto produk</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Foto membantu mencocokkan barang saat OCR nota dan memilih produk. JPG/PNG/WebP,
            otomatis diperkecil. Foto langsung tersimpan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <span className="fas fa-camera mr-2" aria-hidden="true" />
              {url ? "Ganti foto" : "Pilih foto"}
            </Button>
            {url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={hapus}
                className="text-destructive hover:text-destructive"
              >
                <span className="fas fa-trash-can mr-2" aria-hidden="true" />
                Hapus
              </Button>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-1 text-xs font-semibold text-primary underline"
              >
                Lihat ukuran penuh
              </a>
            )}
          </div>
          {pesan && (
            <p role="status" className="mt-2 text-xs font-semibold text-hijau">
              {pesan}
            </p>
          )}
          {err && (
            <p role="alert" className="mt-2 text-xs font-semibold text-merah">
              {err}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={pilih}
      />
    </div>
  );
}
