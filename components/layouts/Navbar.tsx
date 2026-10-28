"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, Heart, User, Menu, ChevronDown, LayoutGrid, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { BrandText } from "@/components/shared/BrandText";
import { getStoreSearchHref } from "@/lib/search-intent";
import { CART_UPDATED_EVENT } from "@/lib/cart-events";
import { useCartStore } from "@/store/useCartStore";
import type { StorefrontSettings } from "@/lib/storefront-settings";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const productCategories: { title: string; href: string; description: string }[] = [
  {
    title: "Laptop",
    href: "/category/laptops",
    description: "Laptop produktivitas, kerja, dan komputasi harian.",
  },
  {
    title: "Gaming Laptop",
    href: "/category/gaming-laptops",
    description: "Laptop gaming performa tinggi & grafis dedicated (LOQ, Legion, ROG).",
  },
  {
    title: "All-in-One PC & Desktop",
    href: "/category/all-in-one-pcs",
    description: "PC All-in-One hemat tempat dan komputer desktop.",
  },
  {
    title: "Smartphone",
    href: "/category/smartphones",
    description: "Smartphone flagship dan kebutuhan harian bergaransi.",
  },
  {
    title: "Tablet",
    href: "/category/tablets",
    description: "Tablet portabel untuk produktivitas dan hiburan.",
  },
  {
    title: "Aksesoris",
    href: "/category/accessories",
    description: "Periferal, memori, tas, dan perlengkapan komputer lengkap.",
  },
];

export function Navbar({
  cartCount = 0,
  currentUserId = null,
  settings,
}: {
  cartCount?: number;
  currentUserId?: string | null;
  settings?: StorefrontSettings;
}) {
  const storeName = settings?.store?.name || "Next Solution";
  const logoUrl = settings?.store?.logo_url || "";
  const displayMode = settings?.store?.logo_display_mode || "logo_only";
  const showLogo = displayMode === "both" || displayMode === "logo_only";
  const showText = displayMode === "both" || displayMode === "text_only";

  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const totalStoreItems = useCartStore((state) => state.getTotalItems());
  const storeUserId = useCartStore((state) => state.userId);
  const [displayCartCount, setDisplayCartCount] = React.useState(cartCount);
  const [previousCartCount, setPreviousCartCount] = React.useState(cartCount);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const accountRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(getStoreSearchHref(query));
    setMobileSearchOpen(false);
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (cartCount !== previousCartCount) {
    setPreviousCartCount(cartCount);
    setDisplayCartCount(cartCount);
  }

  React.useEffect(() => {
    const onCartUpdated = (event: Event) => {
      const nextCount = (event as CustomEvent<number>).detail;
      if (Number.isInteger(nextCount) && nextCount >= 0) {
        setDisplayCartCount(nextCount);
      }
    };
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);

    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
  }, []);

  const effectiveCartCount = mounted
    ? (!currentUserId ? 0 : (storeUserId === currentUserId ? totalStoreItems : displayCartCount))
    : cartCount;

  const resetAccountTimer = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAccountOpen(false), 10_000);
  }, []);
  React.useEffect(() => {
    if (accountOpen) resetAccountTimer();
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, [accountOpen, resetAccountTimer]);
  React.useEffect(() => {
    const outside = (event: PointerEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setAccountOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200 border-b",
        isScrolled
          ? "bg-background/80 backdrop-blur-lg border-border"
          : "bg-background border-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Mobile Menu */}
          <div className="flex items-center lg:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="mr-2" />}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-left">{storeName}</SheetTitle>
                </SheetHeader>
                <div className="grid gap-3 py-4">
                  <div className="space-y-1">
                    <Link
                      href="/products"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-base font-semibold transition-colors hover:bg-muted hover:text-primary"
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid className="size-4 text-primary" />
                        Semua Produk
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">Katalog Lengkap &rarr;</span>
                    </Link>
                    <div className="ml-3 border-l-2 border-border/60 pl-3 space-y-0.5">
                      {productCategories.map((cat) => (
                        <Link
                          key={cat.title}
                          href={cat.href}
                          className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {cat.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Link href="/brands" className="rounded-lg px-3 py-2 text-base font-semibold hover:bg-muted">
                    Brand
                  </Link>
                  <Link href="/promo" className="rounded-lg px-3 py-2 text-base font-semibold text-destructive hover:bg-muted">
                    Promo
                  </Link>
                  <Link href="/compare" className="rounded-lg px-3 py-2 text-base font-semibold hover:bg-muted">
                    Bandingkan
                  </Link>
                  <Link href="/about" className="rounded-lg px-3 py-2 text-base font-semibold hover:bg-muted">
                    Tentang Kami
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Logo Mobile */}
            <Link href="/" className="flex items-center gap-2">
              {showLogo && (
                <Image
                  src={logoUrl || "/brand/next-solution-symbol.png"}
                  alt={storeName}
                  width={36}
                  height={36}
                  unoptimized
                  priority
                  className="size-9 object-contain shrink-0"
                />
              )}
              {showText && (
                <BrandText
                  storeName={storeName}
                  word1={settings?.store?.brand_word1}
                  word2={settings?.store?.brand_word2}
                  word1Color={settings?.store?.brand_word1_color}
                  word2Color={settings?.store?.brand_word2_color}
                  className="text-xl"
                />
              )}
            </Link>
          </div>

          {/* Logo Desktop */}
          <div className="hidden lg:flex lg:items-center lg:gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              {showLogo && (
                <Image
                  src={logoUrl || "/brand/next-solution-symbol.png"}
                  alt={storeName}
                  width={42}
                  height={42}
                  unoptimized
                  priority
                  className="size-10 object-contain shrink-0"
                />
              )}
              {showText && (
                <BrandText
                  storeName={storeName}
                  word1={settings?.store?.brand_word1}
                  word2={settings?.store?.brand_word2}
                  word1Color={settings?.store?.brand_word1_color}
                  word2Color={settings?.store?.brand_word2_color}
                  className="text-2xl"
                />
              )}
            </Link>

            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-foreground hover:text-primary transition-colors">Produk</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[450px] p-4 md:w-[540px] lg:w-[620px]">
                      {/* Opsi Semua Produk (All Products) */}
                      <div className="mb-3">
                        <NavigationMenuLink
                          render={<Link href="/products" />}
                          className="group flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 transition-all duration-150 hover:border-primary/40 hover:bg-primary/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                              <LayoutGrid className="size-4.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                Semua Produk
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                   Katalog Lengkap
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground transition-colors group-hover:text-foreground/80">
                                Jelajahi seluruh koleksi laptop, PC desktop, smartphone, dan aksesoris.
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-1 group-hover:text-primary" />
                        </NavigationMenuLink>
                      </div>

                      {/* Header Kategori */}
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Pilih Berdasarkan Kategori
                        </span>
                        <Link
                          href="/products"
                          className="text-[11px] font-medium text-primary hover:underline"
                        >
                          Lihat semua &rarr;
                        </Link>
                      </div>

                      {/* Grid Kategori */}
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {productCategories.map((component) => (
                          <ListItem
                            key={component.title}
                            title={component.title}
                            href={component.href}
                          >
                            {component.description}
                          </ListItem>
                        ))}
                      </ul>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/brands" />} className={cn(navigationMenuTriggerStyle(), "bg-transparent text-foreground hover:text-primary transition-colors")}>
                    Brand
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/promo" />} className={cn(navigationMenuTriggerStyle(), "bg-transparent text-destructive font-semibold hover:text-destructive/80 transition-colors")}>
                    Promo
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/compare" />} className={cn(navigationMenuTriggerStyle(), "bg-transparent text-foreground hover:text-primary transition-colors")}>
                    Bandingkan
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/about" />} className={cn(navigationMenuTriggerStyle(), "bg-transparent text-foreground hover:text-primary transition-colors")}>
                    Tentang Kami
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Search, Actions */}
          <div className="relative flex min-w-0 flex-1 items-center justify-end gap-3 lg:flex-none lg:w-auto">
            <form onSubmit={submitSearch} className="relative hidden w-full max-w-sm items-center sm:flex lg:w-72 xl:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk atau spesifikasi..."
                className="w-full bg-white dark:bg-[#1A1C23] border border-slate-300/90 dark:border-white/20 pl-9 rounded-full text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 shadow-2xs transition-all duration-200"
              />
            </form>

            <Button variant="ghost" size="icon" className="rounded-full sm:hidden" aria-label="Cari produk" aria-expanded={mobileSearchOpen} onClick={() => setMobileSearchOpen((open) => !open)}>
              <Search className="size-5" />
            </Button>
            {mobileSearchOpen && <form onSubmit={submitSearch} className="absolute left-0 right-0 top-14 z-50 flex items-center rounded-full bg-background border border-slate-300 dark:border-white/20 p-2 shadow-lg sm:hidden">
              <Input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." aria-label="Cari produk" className="border-none bg-transparent" />
              <Button type="submit" size="sm" className="ml-2 rounded-full">Cari</Button>
            </form>}
            
            <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border/80 bg-card/80 p-1 shadow-sm backdrop-blur-sm sm:gap-1">
              <ThemeToggle className="size-9 rounded-full transition-all duration-200 hover:bg-muted active:scale-95 sm:size-10" />
              <Button variant="ghost" size="icon" className="group hidden size-9 rounded-full transition-all duration-200 hover:bg-muted active:scale-95 sm:flex sm:size-10" aria-label="Wishlist" render={<Link href="/wishlist" />}>
                <Heart className="size-5 text-foreground/80 transition-colors group-hover:text-destructive" />
              </Button>
              <div ref={accountRef} className="relative">
                <Button type="button" variant="ghost" size="icon" className={`size-9 rounded-full transition-all duration-200 hover:bg-muted active:scale-95 sm:size-10 ${accountOpen ? "bg-muted text-primary" : ""}`} aria-label="Menu akun" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)}>
                  <User className="size-5 text-foreground/80 transition-colors" />
                </Button>
                {accountOpen && <div onPointerMove={resetAccountTimer} onFocus={resetAccountTimer} onClick={resetAccountTimer} className="absolute right-0 top-12 z-[70] w-56 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
                  <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium"><span>Akun & tampilan</span><ChevronDown className="size-4 rotate-180 text-muted-foreground" /></div>
                  <Link href="/profile" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Profil akun</Link>
                  <Link href="/wishlist" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Wishlist</Link>
                  <Link href="/compare" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Bandingkan Produk</Link>
                  <Link href="/cart" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Keranjang</Link>
                  <div className="my-1 border-t" />
                  <div className="flex items-center justify-between px-3 py-1 text-sm"><span>Mode tema</span><ThemeToggle /></div>
                  <p className="px-3 pb-1 text-[11px] text-muted-foreground">Menu tertutup otomatis saat tidak digunakan.</p>
                </div>}
              </div>
              <Button variant="ghost" size="icon" className="relative size-9 rounded-full text-foreground transition-all duration-200 hover:bg-muted active:scale-95 sm:size-10" aria-label={effectiveCartCount ? `Keranjang, ${effectiveCartCount} barang` : "Keranjang"} render={<Link href="/cart" />}>
                <ShoppingCart className="size-5 text-foreground/80" />
                {effectiveCartCount > 0 && (
                  <span
                    key={effectiveCartCount}
                    className="absolute -right-0.5 -top-0.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm animate-in zoom-in-75 duration-200"
                  >
                    {effectiveCartCount > 99 ? "99+" : effectiveCartCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string; href: string }
>(({ className, title, children, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink
        render={<Link href={href} ref={ref} {...props} />}
        className={cn(
          "group block select-none space-y-1 rounded-xl p-3 leading-none no-underline outline-none transition-all duration-150 hover:bg-muted focus:bg-muted",
          className
        )}
      >
        <div className="text-sm font-semibold leading-none text-foreground transition-colors group-hover:text-primary">
          {title}
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground transition-colors group-hover:text-foreground/85 mt-1">
          {children}
        </p>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
