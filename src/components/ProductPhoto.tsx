"use client";
import { cn } from "@/components/ui/utils";

export function ProductPhoto({
  src,
  alt = "",
  className,
  iconClassName = "text-lg",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className={cn("fas fa-image", iconClassName)} aria-hidden="true" />
      {src ? (
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full bg-white object-contain"
          onError={(e) => {
            // Kalau file hilang/bucket belum siap, tampilkan ikon placeholder.
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}
