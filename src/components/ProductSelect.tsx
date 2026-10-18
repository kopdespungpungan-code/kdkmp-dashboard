"use client";
import { useId, useState } from "react";
import type { ProductOpt } from "@/lib/types";
import { Input } from "@/components/ui/input";

export default function ProductSelect({
  name,
  options,
  onPick,
  resetOnPick,
  placeholder = "Ketik nama barang...",
}: {
  name?: string;
  options: ProductOpt[];
  onPick?: (id: number) => void;
  resetOnPick?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const [val, setVal] = useState("");
  const [id, setId] = useState("");
  const map = new Map(options.map((o) => [o.item, o.id]));

  return (
    <div>
      <Input
        list={listId}
        value={val}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          const found = map.get(v);
          if (found && onPick) onPick(found);
          if (found && resetOnPick) {
            setVal("");
            setId("");
            return;
          }
          setVal(v);
          setId(found ? String(found) : "");
        }}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.id} value={o.item} />
        ))}
      </datalist>
      {name && <input type="hidden" name={name} value={id} />}
      {val && !id && <p className="hint text-merah">Pilih barang dari daftar yang muncul.</p>}
    </div>
  );
}
