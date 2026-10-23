"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ProductOpt } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ProductPhoto } from "@/components/ProductPhoto";
import { cn } from "@/components/ui/utils";
import { rupiah } from "@/lib/format";

const metaProduk = (o: ProductOpt) =>
  [
    o.sku ? `SKU ${o.sku}` : null,
    o.gramasi,
    o.stok_toko != null ? `stok ${o.stok_toko}` : null,
    o.harga_jual != null ? rupiah(o.harga_jual) : null,
  ]
    .filter(Boolean)
    .join(" · ");

export default function ProductSelect({
  inputId,
  name,
  options,
  onPick,
  resetOnPick,
  placeholder = "Ketik nama barang...",
}: {
  inputId?: string;
  name?: string;
  options: ProductOpt[];
  onPick?: (id: number) => void;
  resetOnPick?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const aktifRef = useRef<HTMLButtonElement>(null);
  const [val, setVal] = useState("");
  const [id, setId] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const cari = val.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!cari) return options.slice(0, 12);
    const kata = cari.split(/\s+/).filter(Boolean);
    return options
      .filter((o) => {
        const teks = `${o.item} ${o.sku ?? ""} ${o.gramasi ?? ""}`.toLowerCase();
        return kata.every((k) => teks.includes(k));
      })
      .slice(0, 30);
  }, [cari, options]);

  const terpilih = id ? options.find((o) => String(o.id) === id) ?? null : null;
  const pilihanAktif = filtered[active];

  useEffect(() => {
    if (!open) return;
    function tutup(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [cari, open]);

  useEffect(() => {
    if (open) aktifRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function pilih(o: ProductOpt) {
    onPick?.(o.id);
    if (resetOnPick) {
      setVal("");
      setId("");
    } else {
      setVal(o.item);
      setId(String(o.id));
    }
    setOpen(false);
  }

  function ubahTeks(v: string) {
    setVal(v);
    setOpen(true);

    const exact = options.find((o) => o.item.toLowerCase() === v.trim().toLowerCase());
    if (exact && resetOnPick && onPick) {
      onPick(exact.id);
      setVal("");
      setId("");
      setOpen(false);
      return;
    }
    setId(exact ? String(exact.id) : "");
  }

  function tombol(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Mode tambah barang (onPick): Enter jangan sampai mengirim form nota.
      if (onPick) {
        e.preventDefault();
        if (open && pilihanAktif) pilih(pilihanAktif);
        return;
      }
      if (!open) return;
      e.preventDefault();
      if (pilihanAktif) pilih(pilihanAktif);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={inputId}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && pilihanAktif ? `${listId}-${pilihanAktif.id}` : undefined}
        autoComplete="off"
        spellCheck={false}
        value={val}
        placeholder={placeholder}
        onChange={(e) => ubahTeks(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={tombol}
      />

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={placeholder}
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Tidak ada produk cocok.
            </p>
          ) : (
            filtered.map((o, i) => (
              <button
                key={o.id}
                ref={i === active ? aktifRef : undefined}
                id={`${listId}-${o.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pilih(o)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
              >
                <ProductPhoto
                  src={o.foto_url}
                  className="h-10 w-10 rounded-md border border-border"
                  iconClassName="text-sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{o.item}</span>
                    {o.subsidi && (
                      <span className="shrink-0 rounded-full bg-merah-muda px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-merah">
                        Subsidi
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {metaProduk(o) || "Tanpa SKU"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {name && <input type="hidden" name={name} value={id} />}
      {val && !id && !open && (
        <p className="hint text-merah">Pilih barang dari daftar yang muncul.</p>
      )}

      {terpilih && !open && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <ProductPhoto
            src={terpilih.foto_url}
            className="h-10 w-10 rounded-md border border-border"
            iconClassName="text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{terpilih.item}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {metaProduk(terpilih) || "Tanpa SKU"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
