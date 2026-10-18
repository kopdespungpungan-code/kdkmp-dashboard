import * as React from "react";
import { cn } from "@/components/ui/utils";

type Tone = "merah" | "kuning" | "hijau" | "abu";

const tones: Record<Tone, string> = {
  merah: "bg-merah-muda text-merah-tua",
  kuning: "bg-kuning-muda text-kuning",
  hijau: "bg-hijau-muda text-hijau",
  abu: "bg-garis/50 text-redup",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "abu", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
