"use client";

import { hapusNota } from "./action";
import { Button } from "@/components/ui/button";

export default function HapusNota({ id, invoiceNo }: { id: number; invoiceNo: string }) {
  return (
    <form
      action={hapusNota}
      onSubmit={(e) => {
        if (!window.confirm(`Hapus ${invoiceNo}? Nota dihapus permanen dan tidak bisa dikembalikan.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive">Hapus nota</Button>
    </form>
  );
}