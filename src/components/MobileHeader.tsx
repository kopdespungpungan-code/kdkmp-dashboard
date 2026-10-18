"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { logout } from "@/app/login/actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 z-40 flex w-full items-center justify-between gap-2 border-b border-garis bg-white/90 backdrop-blur px-3 py-2.5 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Buka menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-[280px] bg-ink text-white">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-lg font-bold text-white">Toko Pungpungan</SheetTitle>
              <p className="text-xs text-white/60">Koperasi Desa Merah Putih</p>
            </SheetHeader>
            <Nav />
            <div className="mt-auto p-6 border-t border-white/10">
              <form action={logout} className="flex items-center gap-2">
                <button className="text-sm text-white/70 underline hover:text-white">Keluar</button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-ink">Toko Pungpungan</span>
        </div>
      </header>
    </>
  );
}
