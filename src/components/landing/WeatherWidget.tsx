"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  RefreshCw,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui/utils";

const LATITUDE = -7.1369;
const LONGITUDE = 111.8028;

type WeatherData = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

type WeatherInfo = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const WEATHER: Record<number, WeatherInfo> = {
  0: { label: "Cerah", icon: Sun, className: "text-amber-500" },
  1: { label: "Cerah berawan", icon: CloudSun, className: "text-amber-500" },
  2: { label: "Berawan", icon: CloudSun, className: "text-sky-500" },
  3: { label: "Mendung", icon: Cloud, className: "text-slate-500" },
  45: { label: "Berkabut", icon: CloudFog, className: "text-slate-500" },
  48: { label: "Kabut beku", icon: CloudFog, className: "text-slate-500" },
  51: { label: "Gerimis ringan", icon: CloudDrizzle, className: "text-sky-500" },
  53: { label: "Gerimis", icon: CloudDrizzle, className: "text-sky-500" },
  55: { label: "Gerimis lebat", icon: CloudDrizzle, className: "text-sky-600" },
  61: { label: "Hujan ringan", icon: CloudRain, className: "text-sky-600" },
  63: { label: "Hujan", icon: CloudRain, className: "text-sky-600" },
  65: { label: "Hujan lebat", icon: CloudRain, className: "text-sky-700" },
  80: { label: "Hujan lokal", icon: CloudRain, className: "text-sky-600" },
  81: { label: "Hujan lokal", icon: CloudRain, className: "text-sky-600" },
  82: { label: "Hujan lebat", icon: CloudRain, className: "text-sky-700" },
  95: { label: "Hujan petir", icon: CloudLightning, className: "text-violet-500" },
  96: { label: "Hujan petir", icon: CloudLightning, className: "text-violet-500" },
  99: { label: "Hujan petir", icon: CloudLightning, className: "text-violet-500" },
};

function weatherInfo(code: number): WeatherInfo {
  return WEATHER[code] ?? {
    label: "Cuaca",
    icon: CloudSun,
    className: "text-sky-500",
  };
}

function dayLabel(iso: string, index: number) {
  if (index === 0) return "Hari ini";
  if (index === 1) return "Besok";
  return new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

export function WeatherWidget({ className }: { className?: string }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(false);

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(LATITUDE));
    url.searchParams.set("longitude", String(LONGITUDE));
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    );
    url.searchParams.set("timezone", "Asia/Jakarta");
    url.searchParams.set("forecast_days", "3");

    fetch(url.toString(), { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Gagal mengambil cuaca");
        return response.json() as Promise<WeatherData>;
      })
      .then((json) => {
        if (!active) return;
        setData(json);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  const current = data ? weatherInfo(data.current.weather_code) : null;
  const CurrentIcon = current?.icon ?? CloudSun;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="weather-panel"
        aria-label="Lihat ramalan cuaca Pungpungan"
        className="inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-full lp-chip px-0 text-xs font-semibold lp-text transition hover:opacity-80 min-[380px]:w-auto min-[380px]:px-2.5 sm:w-auto sm:px-3"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
        ) : (
          <CurrentIcon className={cn("h-4 w-4", current?.className)} />
        )}
        <span className="hidden min-[380px]:inline">
          {data ? `${Math.round(data.current.temperature_2m)}°C` : "Cuaca"}
        </span>
        <ChevronDown
          className={cn(
            "hidden h-3 w-3 lp-soft transition-transform sm:block",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          id="weather-panel"
          className="fixed left-4 right-4 top-16 z-50 w-auto overflow-hidden rounded-3xl lp-glass-strong p-4 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] lp-soft">
                Cuaca Pungpungan
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold lp-text">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                Kalitidu, Bojonegoro
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              aria-label="Muat ulang cuaca"
              title="Muat ulang cuaca"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full lp-chip lp-muted transition hover:opacity-80"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>

          {loading && (
            <div className="mt-4 space-y-3" aria-live="polite">
              <div className="h-20 animate-pulse rounded-2xl lp-chip" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-24 animate-pulse rounded-2xl lp-chip" />
                <div className="h-24 animate-pulse rounded-2xl lp-chip" />
                <div className="h-24 animate-pulse rounded-2xl lp-chip" />
              </div>
              <p className="text-center text-[11px] lp-soft">Mengambil data cuaca…</p>
            </div>
          )}

          {!loading && error && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Cuaca belum bisa dimuat.
              </p>
              <p className="mt-1 text-xs lp-muted">
                Periksa koneksi internet, lalu coba lagi.
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Coba lagi
              </button>
            </div>
          )}

          {!loading && !error && data && current && (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-2xl lp-chip p-3">
                <CurrentIcon className={cn("h-10 w-10 shrink-0", current.className)} />
                <div>
                  <p className="text-3xl font-semibold leading-none lp-text">
                    {Math.round(data.current.temperature_2m)}°
                  </p>
                  <p className="mt-1 text-xs lp-muted">{current.label}</p>
                </div>
                <div className="ml-auto space-y-1.5 text-right text-[11px] lp-muted">
                  <p className="flex items-center justify-end gap-1">
                    <Droplets className="h-3 w-3" />
                    {Math.round(data.current.relative_humidity_2m)}% lembap
                  </p>
                  <p className="flex items-center justify-end gap-1">
                    <Wind className="h-3 w-3" />
                    {Math.round(data.current.wind_speed_10m)} km/j
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {data.daily.time.slice(0, 3).map((day, index) => {
                  const info = weatherInfo(data.daily.weather_code[index]);
                  const Icon = info.icon;
                  return (
                    <div key={day} className="rounded-2xl lp-chip p-2.5 text-center">
                      <p className="text-[10px] font-medium lp-soft">
                        {dayLabel(day, index)}
                      </p>
                      <Icon className={cn("mx-auto mt-1.5 h-5 w-5", info.className)} />
                      <p className="mt-1 text-xs font-semibold lp-text">
                        {Math.round(data.daily.temperature_2m_max[index])}°
                        <span className="ml-1 font-normal lp-soft">
                          {Math.round(data.daily.temperature_2m_min[index])}°
                        </span>
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-sky-500">
                        {data.daily.precipitation_probability_max[index] ?? 0}% hujan
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-[10px] leading-relaxed lp-soft">
                Sumber: Open-Meteo. Prakiraan cuaca dapat berubah; tetap cek kondisi
                lapangan sebelum beraktivitas.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
