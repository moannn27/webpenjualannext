"use client";

import { Search, Bell, ChevronDown, LogOut, Store, UserRound } from "lucide-react";
import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { logout } from "@/actions/auth";

export function AdminHeader({ adminName = "Admin" }: { adminName?: string }) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/admin/products?search=${encodeURIComponent(search.trim())}`);
  };
  const resetTimer = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 10_000);
  }, []);
  useEffect(() => {
    if (menuOpen) resetTimer();
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, [menuOpen, resetTimer]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return (
    <header className="h-16 bg-card border-b flex items-center justify-between gap-3 pl-14 pr-3 sm:px-6 sticky top-0 z-30">
      <div className="flex-1 max-w-md">
        <form className="relative" onSubmit={submitSearch}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products, orders, or customers..."
            className="w-full bg-muted/50 border-none pl-9 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </form>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Lihat pesanan" render={<Link href="/admin/orders" />} className="rounded-full relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card"></span>
        </Button>
        <div className="h-8 w-px bg-border mx-2"></div>
        <div ref={menuRef} className="relative">
          <Button type="button" variant="ghost" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Buka menu admin" className="flex h-auto items-center gap-3 rounded-xl px-2 py-1.5">
            <span className="text-right hidden sm:block"><span className="block max-w-48 truncate text-sm font-medium leading-none">{adminName}</span><span className="mt-1 block text-xs text-muted-foreground">Admin</span></span>
            <Avatar className="h-9 w-9 border"><AvatarFallback>{adminName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <ChevronDown className={`size-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </Button>
          {menuOpen && <div onPointerMove={resetTimer} onFocus={resetTimer} onClick={resetTimer} className="absolute right-0 top-12 z-[70] w-60 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-xl">
            <p className="truncate px-3 py-2 text-sm font-semibold">{adminName}</p>
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"><UserRound className="size-4" />Profil akun</Link>
            <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"><Store className="size-4" />Lihat toko</Link>
            <div className="my-1 border-t" />
            <div className="flex items-center justify-between px-3 py-1 text-sm"><span>Mode tema</span><ThemeToggle /></div>
            <form action={logout}><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><LogOut className="size-4" />Keluar</button></form>
            <p className="px-3 pb-1 text-[11px] text-muted-foreground">Menu tertutup setelah 10 detik tanpa aktivitas.</p>
          </div>}
        </div>
      </div>
    </header>
  );
}
