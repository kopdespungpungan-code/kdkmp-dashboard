"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductPhoto } from "@/components/ProductPhoto";
import { kompresGambar } from "@/lib/kompres-gambar";
import {
  MAKS_UKURAN_DOKUMEN,
  tipeDokumenValid,
  type JenisDokumenStok,
} from "@/lib/stok-dokumen";

type Berkas = {
  path: string;
  nama: string;
  tipe: string;
};

const MAKS_FOTO_ASLI = 10 * 1024 * 1024;

export default function DokumenStok({
  onBusyChange,
}: {
  onBusyChange?: (busy: boolean) => void;
}) {
  const dokInputRef = useRef<HTMLInputElement>(null);
  const stbInputRef = useRef<HTMLInputElement>(null);
  const [dok, setDok] = useState<Berkas | null>(null);
  const [stb, setStb] = useState<Berkas | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<JenisDokumenStok | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function mulai(jenis: JenisDokumenStok) {
    setErr(null);
    setPesan(null);
    setBusy(jenis);
    onBusyChange?.(true);
  }

  function selesai() {
    setBusy(null);
    onBusyChange?.(false);
  }

  async function hapusPath(path: string) {
    await fetch(`/api/stok/dokumen?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }).catch(() => null);
  }

  async function pilihDokumentasi(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr(null);
    setPesan(null);
    if (!tipeDokumenValid("dokumentasi", file.type)) {
      return setErr("Dokumentasi harus berupa foto JPG, PNG, atau WebP.");
    }
    if (file.size > MAKS_FOTO_ASLI) {
      return setErr("Ukuran foto maksimal 10 MB.");
    }

    const lama = dok;
    setPreview(URL.createObjectURL(file));
    mulai("dokumentasi");

    try {
      const blob = await kompresGambar(file, { max: 1400, quality: 0.84 });
      if (blob.size > MAKS_UKURAN_DOKUMEN) {
        throw new Error("Foto setelah dikompres masih lebih dari 4 MB.");
      }

      const fd = new FormData();
      fd.set("jenis", "dokumentasi");
      fd.set("file", blob, "dokumentasi.jpg");

      const res = await fetch("/api/stok/dokumen", { method: "POST", body: fd });
      if (res.redirected) {
        throw new Error("Sesi login berakhir. Muat ulang halaman lalu coba lagi.");
      }
      const json = (await res.json().catch(() => ({}))) as {
        path?: string;
        error?: string;
      };
      if (!res.ok || !json.path) {
        throw new Error(json.error ?? "Gagal mengunggah dokumentasi.");
      }

      setDok({ path: json.path, nama: file.name, tipe: "image/jpeg" });
      setPesan("Dokumentasi siap disimpan.");
      if (lama) void hapusPath(lama.path);
    } catch (e: any) {
      setPreview(null);
      setErr(e?.message || "Gagal mengunggah dokumentasi.");
      if (lama) setPesan("Dokumentasi lama tetap dipakai.");
    } finally {
      selesai();
    }
  }

  async function pilihStb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr(null);
    setPesan(null);
    if (!tipeDokumenValid("stb", file.type)) {
      return setErr("STB harus berupa PDF, JPG, PNG, atau WebP.");
    }
    if (file.size > MAKS_UKURAN_DOKUMEN) {
      return setErr("Ukuran STB maksimal 4 MB.");
    }

    const lama = stb;
    mulai("stb");

    try {
      const fd = new FormData();
      fd.set("jenis", "stb");
      fd.set("file", file, file.name || "stb.pdf");

      const res = await fetch("/api/stok/dokumen", { method: "POST", body: fd });
      if (res.redirected) {
        throw new Error("Sesi login berakhir. Muat ulang halaman lalu coba lagi.");
      }
      const json = (await res.json().catch(() => ({}))) as {
        path?: string;
        error?: string;
      };
      if (!res.ok || !json.path) throw new Error(json.error ?? "Gagal mengunggah STB.");

      setStb({ path: json.path, nama: file.name || "STB", tipe: file.type });
      setPesan("STB siap disimpan.");
      if (lama) void hapusPath(lama.path);
    } catch (e: any) {
      setErr(e?.message || "Gagal mengunggah STB.");
      if (lama) setPesan("STB lama tetap dipakai.");
    } finally {
      selesai();
    }
  }

  async function hapus(jenis: JenisDokumenStok) {
    const berkas = jenis === "dokumentasi" ? dok : stb;
    if (!berkas) return;

    const label = jenis === "dokumentasi" ? "dokumentasi" : "STB";
    if (!window.confirm(`Hapus ${label} ini?`)) return;

    mulai(jenis);
    try {
      const res = await fetch(
        `/api/stok/dokumen?path=${encodeURIComponent(berkas.path)}`,
        { method: "DELETE" },
      );
      if (res.redirected) {
        throw new Error("Sesi login berakhir. Muat ulang halaman lalu coba lagi.");
      }
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Gagal menghapus ${label}.`);

      if (jenis === "dokumentasi") {
        setDok(null);
        setPreview(null);
      } else {
        setStb(null);
      }
      setPesan(`${jenis === "dokumentasi" ? "Dokumentasi" : "STB"} dihapus.`);
    } catch (e: any) {
      setErr(e?.message || `Gagal menghapus ${label}.`);
    } finally {
      selesai();
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Dokumentasi & STB</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Opsional. Dokumentasi berupa foto barang/kegiatan; STB berupa PDF atau foto
            surat. File diunggah saat dipilih, lalu disimpan bersama catatan stok.
          </p>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-redup">
          Opsional
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <span className="fas fa-camera text-primary" aria-hidden="true" />
            <p className="text-xs font-semibold">Dokumentasi</p>
            {dok && (
              <span className="ml-auto text-[11px] font-semibold text-hijau">Siap</span>
            )}
          </div>
          <div className="mt-2 flex items-start gap-3">
            <ProductPhoto
              src={preview}
              alt="Dokumentasi stok"
              className="h-14 w-14 rounded-lg border border-border"
              iconClassName="text-lg"
            />
            <div className="min-w-0">
              {dok ? (
                <p className="truncate text-xs font-semibold">{dok.nama}</p>
              ) : (
                <p className="text-xs text-redup">Belum ada foto.</p>
              )}
              <p className="mt-0.5 text-[11px] leading-relaxed text-redup">
                JPG/PNG/WebP, otomatis diperkecil.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => dokInputRef.current?.click()}
                >
                  <span className="fas fa-camera mr-1.5" aria-hidden="true" />
                  {dok ? "Ganti" : "Pilih foto"}
                </Button>
                {dok && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => hapus("dokumentasi")}
                    className="text-destructive hover:text-destructive"
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </div>
          </div>
          {busy === "dokumentasi" && (
            <p className="mt-2 text-[11px] font-semibold text-kuning">
              Mengunggah dokumentasi...
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <span className="fas fa-file-lines text-primary" aria-hidden="true" />
            <p className="text-xs font-semibold">STB</p>
            {stb && (
              <span className="ml-auto text-[11px] font-semibold text-hijau">Siap</span>
            )}
          </div>
          <div className="mt-2 flex items-start gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
              <span
                className={`fas ${
                  !stb
                    ? "fa-file-lines"
                    : stb.tipe === "application/pdf"
                      ? "fa-file-pdf"
                      : "fa-file-image"
                } text-lg`}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              {stb ? (
                <p className="truncate text-xs font-semibold">{stb.nama}</p>
              ) : (
                <p className="text-xs text-redup">Belum ada file.</p>
              )}
              <p className="mt-0.5 text-[11px] leading-relaxed text-redup">
                PDF/JPG/PNG/WebP, maks 4 MB.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => stbInputRef.current?.click()}
                >
                  <span className="fas fa-paperclip mr-1.5" aria-hidden="true" />
                  {stb ? "Ganti" : "Pilih file"}
                </Button>
                {stb && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => hapus("stb")}
                    className="text-destructive hover:text-destructive"
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </div>
          </div>
          {busy === "stb" && (
            <p className="mt-2 text-[11px] font-semibold text-kuning">
              Mengunggah STB...
            </p>
          )}
        </div>
      </div>

      {pesan && (
        <p role="status" className="mt-3 text-xs font-semibold text-hijau">
          {pesan}
        </p>
      )}
      {err && (
        <p role="alert" className="mt-2 text-xs font-semibold text-merah">
          {err}
        </p>
      )}

      <input
        ref={dokInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={pilihDokumentasi}
      />
      <input
        ref={stbInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        hidden
        onChange={pilihStb}
      />
      <input type="hidden" name="dokumentasi_path" value={dok?.path ?? ""} />
      <input type="hidden" name="stb_path" value={stb?.path ?? ""} />
    </div>
  );
}
