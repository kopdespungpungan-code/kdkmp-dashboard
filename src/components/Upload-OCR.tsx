"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OcrLoadingOverlay, type OcrPageInfo, type OcrPhase } from "@/components/OcrLoadingOverlay";
import { OcrErrorToast } from "@/components/OcrErrorToast";
import { jamPendek, kunciIsiNota, type OcrNota } from "@/lib/ocr-nota";

const BATCH = 2; // halaman per permintaan ke model
const MAX_PAGES = 100; // batas pengaman

async function ocrBatch(images: string[]) {
  const res = await fetch("/api/ocr-nota", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  const raw = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(raw);
  } catch {}
  if (!res.ok)
    throw new Error(json.error ?? `Server membalas ${res.status}: ${raw.slice(0, 120) || "kosong"}`);
  return (Array.isArray(json) ? json : [json]) as any[];
}

export default function UploadOcr() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<OcrPhase>("read");
  const [fileName, setFileName] = useState("");
  const [pageInfo, setPageInfo] = useState<OcrPageInfo>(null);
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return setErr("File harus PDF.");
    if (file.size > 20 * 1024 * 1024) return setErr("Maksimal 20 MB.");

    setLoading(true);
    setErr(null);
    setFileName(file.name);
    setProgress(4);
    setPhase("read");
    setPageInfo(null);

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const total = Math.min(pdf.numPages, MAX_PAGES);
      setProgress(10);

      const all: any[] = [];
      for (let start = 1; start <= total; start += BATCH) {
        const end = Math.min(start + BATCH - 1, total);
        setPhase("render");
        setPageInfo({ start, end, total });
        setProgress(10 + ((start - 1) / total) * 80);

        const images: string[] = [];
        for (let p = start; p <= end; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          images.push(canvas.toDataURL("image/jpeg", 0.8));
        }

        setPhase("ocr");
        setProgress(10 + ((start - 1) / total) * 80 + (0.3 / total) * 80);
        all.push(...(await ocrBatch(images)));
        setProgress(10 + (end / total) * 80);
      }

      setPhase("finish");
      setProgress(94);

      // buang duplikat: nomor nota sama, atau isi nota sama
      // (tanggal + jam + total + daftar barang sama).
      const seen = new Set<string>();
      const unique = all.filter((n) => {
        if (!n) return true;
        const nota = n as OcrNota;
        const isi = kunciIsiNota({ ...nota, jam: jamPendek(nota.jam) });
        const keys: string[] = [];
        if (nota.invoice_no) keys.push(`inv:${nota.invoice_no}`);
        if (isi) keys.push(`isi:${isi}`);
        if (keys.length === 0) return true;
        if (keys.some((k) => seen.has(k))) return false;
        for (const k of keys) seen.add(k);
        return true;
      });

      sessionStorage.setItem("ocr_nota", JSON.stringify(unique));
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 350));
      router.push("/penjualan/baru?ocr=1");
    } catch (e: any) {
      setErr(e?.message || "Gagal membaca PDF.");
    } finally {
      setLoading(false);
      setProgress(0);
      setPhase("read");
      setPageInfo(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={onPick} />
        <Button type="button" variant="outline" disabled={loading} onClick={() => inputRef.current?.click()}>
          <span className="fas fa-upload mr-2" aria-hidden="true" />
          {loading ? "OCR berjalan..." : "Upload PDF (OCR)"}
        </Button>
      </div>

      <OcrLoadingOverlay
        open={loading}
        phase={phase}
        progress={progress}
        fileName={fileName}
        pageInfo={pageInfo}
      />
      <OcrErrorToast message={err} onClose={() => setErr(null)} />
    </>
  );
}
