"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/components/ui/utils";

export type OcrPhase = "read" | "render" | "ocr" | "finish";
export type OcrPageInfo = { start: number; end: number; total: number } | null;

const PHASE_LABEL: Record<OcrPhase, string> = {
  read: "Membaca struktur file",
  render: "Menyiapkan halaman",
  ocr: "AI sedang membaca dokumen",
  finish: "Menyusun hasil OCR",
};

const PHASE_NOTE: Record<OcrPhase, string> = {
  read: "Membuka dan memeriksa file...",
  render: "Merender halaman ke gambar...",
  ocr: "Model sedang mengekstrak teks dan angka...",
  finish: "Merapikan hasil dan menyiapkan data...",
};

const STEPS: { key: OcrPhase; label: string }[] = [
  { key: "read", label: "File" },
  { key: "render", label: "Render" },
  { key: "ocr", label: "OCR AI" },
  { key: "finish", label: "Selesai" },
];

export function OcrLoadingOverlay({
  open,
  phase,
  progress,
  fileName,
  pageInfo,
}: {
  open: boolean;
  phase: OcrPhase;
  progress: number;
  fileName?: string;
  pageInfo?: OcrPageInfo;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Kunci scroll selama overlay OCR tampil.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted) return null;

  const activeStep = STEPS.findIndex((step) => step.key === phase);
  const pageText =
    phase === "finish"
      ? "Merapikan hasil OCR"
      : pageInfo
        ? `Halaman ${pageInfo.start}${pageInfo.end > pageInfo.start ? `–${pageInfo.end}` : ""} dari ${pageInfo.total}`
        : "Menyiapkan halaman...";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="ocr-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-background/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ocr-loading-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            <div className="relative overflow-hidden border-b border-border bg-secondary/60 px-6 py-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="relative flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                  <span className="fas fa-file-invoice text-3xl text-primary/80" aria-hidden="true" />
                  <motion.span
                    className="absolute inset-x-2 h-0.5 rounded-full bg-primary shadow-[0_0_10px_rgba(190,30,45,0.55)]"
                    animate={{ top: ["16%", "84%", "16%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    AI OCR
                  </span>
                  <h2
                    id="ocr-loading-title"
                    aria-live="polite"
                    className="mt-2 font-display text-lg font-bold leading-tight"
                  >
                    {PHASE_LABEL[phase]}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">{fileName || "Menyiapkan file..."}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{pageText}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{PHASE_NOTE[phase]}</p>
                </div>
                <span className="font-display text-2xl font-bold tabular-nums">{Math.round(progress)}%</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.35 }}
                />
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {STEPS.map((step, index) => {
                  const done = activeStep > index;
                  const active = step.key === phase;
                  return (
                    <div key={step.key} className="text-center">
                      <div
                        className={cn(
                          "mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                          done
                            ? "border-hijau/30 bg-hijau-muda text-hijau"
                            : active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <span className="fas fa-check" aria-hidden="true" /> : index + 1}
                      </div>
                      <p
                        className={cn(
                          "mt-1.5 text-[10px] font-semibold",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <span className="fas fa-circle-info mt-0.5 text-primary" aria-hidden="true" />
                <span>Jangan tutup atau muat ulang halaman ini sampai OCR selesai.</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
