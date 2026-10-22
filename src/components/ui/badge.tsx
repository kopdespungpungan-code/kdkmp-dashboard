import * as React from "react";
import { cn } from "@/components/ui/utils";

type Tone = "merah" | "kuning" | "hijau" | "abu";

const tones: Record<Tone, string> = {
  merah: "bg-accent text-accent-foreground border border-primary/30",
  kuning: "bg-kuning-muda text-kuning border border-kuning/30",
  hijau: "bg-hijau-muda text-hijau border border-hijau/30",
  abu: "bg-muted text-muted-foreground border border-border",
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
