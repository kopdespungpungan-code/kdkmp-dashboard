"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { logout } from "@/app/login/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <header className="fixed top-0 z-40 flex w-full items-center justify-between gap-2 border-b border-border bg-background/90 backdrop-blur px-3 py-2.5 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Buka menu">
              <span className="fas fa-bars text-lg" aria-hidden="true" />
              <span className="sr-only">Buka menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full max-w-[280px] bg-card text-foreground border border-border">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-lg font-bold font-display">Toko Pungpungan</SheetTitle>
              <p className="text-xs text-muted-foreground">Koperasi Desa Merah Putih</p>
            </SheetHeader>
            <Nav />
            <div className="mt-auto p-6 border-t border-border/50">
              <ThemeToggle className="mb-4" />
              <form action={logout} className="flex items-center gap-2">
                <button className="text-sm text-muted-foreground underline hover:text-foreground">Keluar</button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-1">
          <img src="/assets/logo-kopdes.jpg" alt="Logo KDKMP" className="h-5 w-5 rounded" />
          <span className="text-sm font-semibold text-foreground">Toko Pungpungan</span>
        </div>
      </header>
    </>
  );
}
