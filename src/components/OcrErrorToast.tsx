"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export function OcrErrorToast({
  message,
  onClose,
  title = "OCR gagal",
}: {
  message: string | null;
  onClose: () => void;
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !message) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="fixed bottom-20 right-4 z-[90] max-w-sm rounded-xl border border-destructive/30 bg-card p-3 shadow-xl lg:bottom-6"
    >
      <div className="flex items-start gap-2.5">
        <span className="fas fa-circle-exclamation mt-0.5 text-destructive" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive">{title}</p>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Tutup pesan error"
        >
          <span className="fas fa-times" aria-hidden="true" />
        </button>
      </div>
    </motion.div>,
    document.body,
  );
}
