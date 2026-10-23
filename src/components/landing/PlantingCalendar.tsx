"use client";

import { useState } from "react";
import { CalendarDays, CloudRain, Info, Sprout, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";

type Musim = "Hujan" | "Kemarau" | "Peralihan";

type BulanTanam = {
  bulan: string;
  singkat: string;
  musim: Musim;
  tanaman: string[];
  kegiatan: string;
};

const KALENDER: BulanTanam[] = [
  {
    bulan: "Januari",
    singkat: "Jan",
    musim: "Hujan",
    tanaman: ["Padi", "Jagung", "Kedelai"],
    kegiatan: "Persiapan lahan, tanam padi, dan perawatan saluran air.",
  },
  {
    bulan: "Februari",
    singkat: "Feb",
    musim: "Hujan",
    tanaman: ["Padi", "Jagung", "Kacang Hijau"],
    kegiatan: "Pemupukan susulan, pengendalian gulma, dan pantau hama.",
  },
  {
    bulan: "Maret",
    singkat: "Mar",
    musim: "Hujan",
    tanaman: ["Padi", "Jagung", "Kedelai"],
    kegiatan: "Perawatan tanaman dan persiapan panen awal.",
  },
  {
    bulan: "April",
    singkat: "Apr",
    musim: "Peralihan",
    tanaman: ["Padi", "Jagung", "Kacang Tanah"],
    kegiatan: "Panen padi, pengolahan tanah, dan tanam palawija.",
  },
  {
    bulan: "Mei",
    singkat: "Mei",
    musim: "Kemarau",
    tanaman: ["Jagung", "Kedelai", "Kacang Hijau"],
    kegiatan: "Tanam palawija dan optimalkan air yang tersedia.",
  },
  {
    bulan: "Juni",
    singkat: "Jun",
    musim: "Kemarau",
    tanaman: ["Jagung", "Kacang Tanah", "Bawang Merah"],
    kegiatan: "Perawatan tanaman, mulsa, dan penghematan air.",
  },
  {
    bulan: "Juli",
    singkat: "Jul",
    musim: "Kemarau",
    tanaman: ["Jagung", "Bawang Merah", "Cabai"],
    kegiatan: "Pantau kekeringan dan serangan hama di musim kemarau.",
  },
  {
    bulan: "Agustus",
    singkat: "Agu",
    musim: "Kemarau",
    tanaman: ["Cabai", "Tomat", "Semangka"],
    kegiatan: "Tanam sayuran dan buah dengan irigasi teratur.",
  },
  {
    bulan: "September",
    singkat: "Sep",
    musim: "Peralihan",
    tanaman: ["Cabai", "Tomat", "Kacang Hijau"],
    kegiatan: "Persiapan musim hujan dan pengolahan lahan.",
  },
  {
    bulan: "Oktober",
    singkat: "Okt",
    musim: "Hujan",
    tanaman: ["Padi", "Jagung", "Cabai"],
    kegiatan: "Awal musim tanam, siapkan benih dan saluran air.",
  },
  {
    bulan: "November",
    singkat: "Nov",
    musim: "Hujan",
    tanaman: ["Padi", "Jagung", "Kedelai"],
    kegiatan: "Tanam padi dan palawija, pantau curah hujan.",
  },
  {
    bulan: "Desember",
    singkat: "Des",
    musim: "Hujan",
    tanaman: ["Padi", "Jagung", "Kacang Hijau"],
    kegiatan: "Perawatan tanaman dan antisipasi genangan air.",
  },
];

const MUSIM_STYLE: Record<Musim, { icon: LucideIcon; className: string }> = {
  Hujan: { icon: CloudRain, className: "text-sky-500" },
  Kemarau: { icon: Sun, className: "text-amber-500" },
  Peralihan: { icon: Sprout, className: "text-emerald-500" },
};

export function PlantingCalendar() {
  const [selected, setSelected] = useState(9);

  const active = KALENDER[selected];
  const MusimIcon = MUSIM_STYLE[active.musim].icon;

  return (
    <div className="rounded-3xl lp-glass p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] lp-soft">
          <CalendarDays className="h-4 w-4 text-emerald-500" />
          Panduan musim tanam
        </div>
        <p className="text-[11px] lp-soft">
          Musim hujan: Okt–Mar · Kemarau: Apr–Sep
        </p>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
        {KALENDER.map((bulan, index) => (
          <button
            key={bulan.bulan}
            type="button"
            onClick={() => setSelected(index)}
            aria-pressed={selected === index}
            className={cn(
              "rounded-full border px-2 py-2 text-xs font-semibold transition sm:px-3",
              selected === index
                ? "border-transparent bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "lp-border lp-chip lp-muted hover:opacity-80",
            )}
          >
            {bulan.singkat}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl lp-chip p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] lp-soft">
              Bulan tanam
            </p>
            <h3 className="mt-1 text-xl font-semibold lp-text sm:text-2xl">
              {active.bulan}
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border lp-border px-3 py-1.5 text-xs font-semibold lp-text">
            <MusimIcon
              className={cn("h-3.5 w-3.5", MUSIM_STYLE[active.musim].className)}
            />
            Musim {active.musim.toLowerCase()}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold lp-muted">Pilihan tanaman</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {active.tanaman.map((tanaman) => (
              <span
                key={tanaman}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
              >
                <Sprout className="h-3.5 w-3.5" />
                {tanaman}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2 rounded-xl border lp-border bg-[color:var(--lp-card)] p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
          <p className="text-xs leading-relaxed lp-muted">{active.kegiatan}</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed lp-soft">
        Panduan umum untuk warga Desa Pungpungan. Sesuaikan dengan kondisi air,
        cuaca harian, dan arahan penyuluh pertanian setempat.
      </p>
    </div>
  );
}
