"use client";

import { ImageIcon } from "lucide-react";

type MockupProps = {
  caption: string;
  aspect?: string;
  variant?: "dashboard" | "nota" | "stok" | "produk" | "laporan" | "mobile";
};

const variants: Record<string, React.ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 400 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="400" height="220" fill="#f8fafc" />
      {/* sidebar */}
      <rect x="0" y="0" width="90" height="220" fill="#ffffff" />
      <rect x="10" y="12" width="70" height="8" rx="2" fill="#e2e8f0" />
      <rect x="10" y="28" width="70" height="6" rx="2" fill="#e2e8f0" />
      <rect x="10" y="42" width="70" height="6" rx="2" fill="#e2e8f0" />
      <rect x="10" y="56" width="70" height="6" rx="2" fill="#e2e8f0" />
      {/* header */}
      <rect x="90" y="0" width="310" height="32" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="100" y="10" width="80" height="12" rx="2" fill="#e2e8f0" />
      {/* KPI cards */}
      <rect x="100" y="44" width="90" height="50" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="200" y="44" width="90" height="50" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="300" y="44" width="90" height="50" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="110" y="52" width="40" height="6" rx="2" fill="#cbd5e1" />
      <rect x="110" y="66" width="60" height="14" rx="2" fill="#be1e2d" opacity="0.7" />
      <rect x="210" y="52" width="40" height="6" rx="2" fill="#cbd5e1" />
      <rect x="210" y="66" width="50" height="14" rx="2" fill="#3b82f6" opacity="0.6" />
      <rect x="310" y="52" width="40" height="6" rx="2" fill="#cbd5e1" />
      <rect x="310" y="66" width="55" height="14" rx="2" fill="#10b981" opacity="0.6" />
      {/* chart */}
      <rect x="100" y="104" width="190" height="100" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="110" y="114" width="60" height="6" rx="2" fill="#cbd5e1" />
      <polyline points="115,180 135,160 155,170 175,145 195,155 215,130 235,140 255,125 275,135" fill="none" stroke="#be1e2d" strokeWidth="2" />
      {/* top products */}
      <rect x="300" y="104" width="100" height="100" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="310" y="114" width="50" height="6" rx="2" fill="#cbd5e1" />
      <rect x="310" y="128" width="80" height="8" rx="2" fill="#f1f5f9" />
      <rect x="310" y="142" width="80" height="8" rx="2" fill="#f1f5f9" />
      <rect x="310" y="156" width="80" height="8" rx="2" fill="#f1f5f9" />
      <rect x="310" y="170" width="80" height="8" rx="2" fill="#f1f5f9" />
      <rect x="310" y="184" width="80" height="8" rx="2" fill="#f1f5f9" />
    </svg>
  ),
  nota: (
    <svg viewBox="0 0 400 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="400" height="220" fill="#f8fafc" />
      <rect x="0" y="0" width="400" height="32" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="10" y="10" width="80" height="12" rx="2" fill="#e2e8f0" />
      <rect x="10" y="44" width="380" height="24" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="52" width="60" height="8" rx="2" fill="#cbd5e1" />
      <rect x="20" y="76" width="360" height="1" fill="#e2e8f0" />
      <rect x="20" y="84" width="200" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="98" width="200" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="112" width="200" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="126" width="200" height="8" rx="2" fill="#f1f5f9" />
      <rect x="280" y="84" width="100" height="8" rx="2" fill="#f1f5f9" />
      <rect x="280" y="98" width="100" height="8" rx="2" fill="#f1f5f9" />
      <rect x="280" y="112" width="100" height="8" rx="2" fill="#f1f5f9" />
      <rect x="280" y="126" width="100" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="148" width="360" height="1" fill="#e2e8f0" />
      <rect x="20" y="156" width="120" height="8" rx="2" fill="#cbd5e1" />
      <rect x="280" y="156" width="100" height="14" rx="2" fill="#be1e2d" opacity="0.7" />
      <rect x="20" y="180" width="100" height="28" rx="14" fill="#be1e2d" />
      <rect x="20" y="188" width="60" height="8" rx="2" fill="#ffffff" />
      <rect x="130" y="180" width="100" height="28" rx="14" fill="#f1f5f9" stroke="#e2e8f0" />
      <rect x="140" y="188" width="60" height="8" rx="2" fill="#cbd5e1" />
    </svg>
  ),
  stok: (
    <svg viewBox="0 0 400 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="400" height="220" fill="#f8fafc" />
      <rect x="0" y="0" width="400" height="32" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="10" y="10" width="80" height="12" rx="2" fill="#e2e8f0" />
      <rect x="10" y="44" width="120" height="8" rx="2" fill="#cbd5e1" />
      <rect x="10" y="60" width="180" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="70" width="60" height="8" rx="2" fill="#e2e8f0" />
      <rect x="200" y="60" width="190" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="210" y="70" width="60" height="8" rx="2" fill="#e2e8f0" />
      <rect x="10" y="104" width="180" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="114" width="60" height="8" rx="2" fill="#e2e8f0" />
      <rect x="200" y="104" width="190" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="210" y="114" width="60" height="8" rx="2" fill="#e2e8f0" />
      <rect x="10" y="150" width="380" height="50" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="160" width="80" height="6" rx="2" fill="#cbd5e1" />
      <rect x="20" y="172" width="360" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="186" width="360" height="8" rx="2" fill="#f1f5f9" />
    </svg>
  ),
  produk: (
    <svg viewBox="0 0 400 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="400" height="220" fill="#f8fafc" />
      <rect x="0" y="0" width="400" height="32" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="10" y="10" width="80" height="12" rx="2" fill="#e2e8f0" />
      <rect x="10" y="44" width="380" height="24" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="52" width="80" height="8" rx="2" fill="#cbd5e1" />
      <rect x="320" y="52" width="60" height="8" rx="2" fill="#e2e8f0" />
      <rect x="10" y="76" width="120" height="130" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="86" width="100" height="60" rx="4" fill="#f1f5f9" />
      <rect x="20" y="154" width="80" height="6" rx="2" fill="#cbd5e1" />
      <rect x="20" y="166" width="60" height="6" rx="2" fill="#e2e8f0" />
      <rect x="20" y="180" width="50" height="6" rx="2" fill="#e2e8f0" />
      <rect x="140" y="76" width="120" height="130" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="150" y="86" width="100" height="60" rx="4" fill="#f1f5f9" />
      <rect x="150" y="154" width="80" height="6" rx="2" fill="#cbd5e1" />
      <rect x="150" y="166" width="60" height="6" rx="2" fill="#e2e8f0" />
      <rect x="150" y="180" width="50" height="6" rx="2" fill="#e2e8f0" />
      <rect x="270" y="76" width="120" height="130" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="280" y="86" width="100" height="60" rx="4" fill="#f1f5f9" />
      <rect x="280" y="154" width="80" height="6" rx="2" fill="#cbd5e1" />
      <rect x="280" y="166" width="60" height="6" rx="2" fill="#e2e8f0" />
      <rect x="280" y="180" width="50" height="6" rx="2" fill="#e2e8f0" />
    </svg>
  ),
  laporan: (
    <svg viewBox="0 0 400 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="400" height="220" fill="#f8fafc" />
      <rect x="0" y="0" width="400" height="32" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="10" y="10" width="80" height="12" rx="2" fill="#e2e8f0" />
      <rect x="10" y="44" width="380" height="24" rx="4" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="52" width="80" height="8" rx="2" fill="#cbd5e1" />
      <rect x="10" y="76" width="185" height="130" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="86" width="60" height="6" rx="2" fill="#cbd5e1" />
      <rect x="20" y="98" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="112" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="126" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="140" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="154" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="168" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="182" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="205" y="76" width="185" height="130" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="215" y="86" width="60" height="6" rx="2" fill="#cbd5e1" />
      <rect x="215" y="98" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="215" y="112" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="215" y="126" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="215" y="140" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="215" y="154" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="215" y="168" width="165" height="8" rx="2" fill="#f1f5f9" />
      <rect x="215" y="182" width="165" height="8" rx="2" fill="#f1f5f9" />
    </svg>
  ),
  mobile: (
    <svg viewBox="0 0 180 320" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="320" fill="#f8fafc" />
      <rect x="0" y="0" width="180" height="40" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="10" y="14" width="60" height="12" rx="2" fill="#e2e8f0" />
      <rect x="130" y="14" width="20" height="12" rx="2" fill="#e2e8f0" />
      <rect x="155" y="14" width="20" height="12" rx="2" fill="#e2e8f0" />
      <rect x="10" y="50" width="160" height="60" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="60" width="60" height="6" rx="2" fill="#cbd5e1" />
      <rect x="20" y="72" width="140" height="10" rx="2" fill="#f1f5f9" />
      <rect x="20" y="86" width="100" height="10" rx="2" fill="#f1f5f9" />
      <rect x="10" y="120" width="160" height="60" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="130" width="60" height="6" rx="2" fill="#cbd5e1" />
      <rect x="20" y="142" width="140" height="10" rx="2" fill="#f1f5f9" />
      <rect x="20" y="156" width="100" height="10" rx="2" fill="#f1f5f9" />
      <rect x="10" y="190" width="160" height="60" rx="6" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="20" y="200" width="60" height="6" rx="2" fill="#cbd5e1" />
      <rect x="20" y="212" width="140" height="10" rx="2" fill="#f1f5f9" />
      <rect x="20" y="226" width="100" height="10" rx="2" fill="#f1f5f9" />
      <rect x="0" y="280" width="180" height="40" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="15" y="290" width="20" height="20" rx="4" fill="#e2e8f0" />
      <rect x="55" y="290" width="20" height="20" rx="4" fill="#e2e8f0" />
      <rect x="95" y="290" width="20" height="20" rx="4" fill="#e2e8f0" />
      <rect x="135" y="290" width="20" height="20" rx="4" fill="#e2e8f0" />
    </svg>
  ),
};

export default function Mockup({ caption, aspect = "16/9", variant = "dashboard" }: MockupProps) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted/20 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex-1 text-center text-[10px] text-muted-foreground">kdkmp-pungpungan.local</div>
      </div>
      <div style={{ aspectRatio: aspect }} className="bg-background">
        {variants[variant] ?? variants.dashboard}
      </div>
      <div className="border-t border-border bg-muted/30 px-3 py-2 text-center text-[11px] italic text-muted-foreground">
        {caption}
      </div>
    </div>
  );
}
