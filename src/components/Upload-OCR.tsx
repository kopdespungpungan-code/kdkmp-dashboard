"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const BATCH = 2;        // halaman per permintaan ke model
const MAX_PAGES = 100;  // batas pengaman

async function ocrBatch(images: string[]) {
  const res = await fetch("/api/ocr-nota", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  const raw = await res.text();
  let json: any = {};
  try { json = JSON.parse(raw); } catch {}
  if (!res.ok)
    throw new Error(json.error ?? `Server membalas ${res.status}: ${raw.slice(0, 120) || "kosong"}`);
  return (Array.isArray(json) ? json : [json]) as any[];
}

export default function UploadOcr() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return setErr("File harus PDF.");
    if (file.size > 20 * 1024 * 1024) return setErr("Maksimal 20 MB.");

    setLoading(true);
    setErr(null);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const total = Math.min(pdf.numPages, MAX_PAGES);
      const all: any[] = [];

      for (let start = 1; start <= total; start += BATCH) {
        const end = Math.min(start + BATCH - 1, total);
        setStatus(`Membaca halaman ${start}-${end} dari ${total}...`);

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
        all.push(...(await ocrBatch(images)));
      }

      // buang duplikat berdasarkan nomor nota
      const seen = new Set<string>();
      const unique = all.filter((n) => {
        if (!n?.invoice_no) return true;
        if (seen.has(n.invoice_no)) return false;
        seen.add(n.invoice_no);
        return true;
      });

      sessionStorage.setItem("ocr_nota", JSON.stringify(unique));
      router.push("/penjualan/baru?ocr=1");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={onPick} />
      <Button type="button" variant="outline" disabled={loading} onClick={() => inputRef.current?.click()}>
        {loading ? status ?? "Membaca PDF..." : "Upload PDF (OCR)"}
      </Button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}