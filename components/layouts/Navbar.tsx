"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ShoppingCart, Heart, User, Menu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { getStoreSearchHref } from "@/lib/search-intent";
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

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Laptops",
    href: "/category/laptops",
    description: "High-performance laptops for work and gaming.",
  },
  {
    title: "Smartphones",
    href: "/category/smartphones",
    description: "Latest flagship and budget-friendly smartphones.",
  },
  {
    title: "Tablets",
    href: "/category/tablets",
    description: "Portable powerhouses for creativity and entertainment.",
  },
  {
    title: "Accessories",
    href: "/category/accessories",
    description: "Enhance your experience with premium accessories.",
  },
];

export function Navbar({ cartCount = 0 }: { cartCount?: number }) {
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
                  <SheetTitle className="text-left">Next Solution</SheetTitle>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <Link href="/products" className="text-lg font-medium">
                    Products
                  </Link>
                  <Link href="/brands" className="text-lg font-medium">
                    Brands
                  </Link>
                  <Link href="/promo" className="text-lg font-medium">
                    Promo
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Logo Mobile */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-primary">
                Next Solution
              </span>
            </Link>
          </div>

          {/* Logo Desktop */}
          <div className="hidden lg:flex lg:items-center lg:gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-primary">
                Next Solution
              </span>
            </Link>

            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent">Products</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                      {components.map((component) => (
                        <ListItem
                          key={component.title}
                          title={component.title}
                          href={component.href}
                        >
                          {component.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/brands" />} className={cn(navigationMenuTriggerStyle(), "bg-transparent")}>
                    Brands
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href="/promo" />} className={cn(navigationMenuTriggerStyle(), "bg-transparent text-destructive hover:text-destructive")}>
                    Promo
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Search, Actions */}
          <div className="relative flex min-w-0 flex-1 items-center justify-end gap-3 lg:flex-none lg:w-auto">
            <form onSubmit={submitSearch} className="relative hidden w-full max-w-sm items-center sm:flex lg:w-72 xl:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="w-full bg-muted/50 border-none pl-9 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50 transition-all duration-200"
              />
            </form>

            <Button variant="ghost" size="icon" className="rounded-full sm:hidden" aria-label="Cari produk" aria-expanded={mobileSearchOpen} onClick={() => setMobileSearchOpen((open) => !open)}>
              <Search className="size-5" />
            </Button>
            {mobileSearchOpen && <form onSubmit={submitSearch} className="absolute left-0 right-0 top-14 z-50 flex items-center rounded-full bg-background p-2 shadow-lg sm:hidden">
              <Input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." aria-label="Cari produk" className="border-none bg-muted/50" />
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
                  <Link href="/cart" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Keranjang</Link>
                  <div className="my-1 border-t" />
                  <div className="flex items-center justify-between px-3 py-1 text-sm"><span>Mode tema</span><ThemeToggle /></div>
                  <p className="px-3 pb-1 text-[11px] text-muted-foreground">Menu tertutup otomatis saat tidak digunakan.</p>
                </div>}
              </div>
              <Button variant="ghost" size="icon" className="relative size-9 rounded-full text-foreground transition-all duration-200 hover:bg-muted active:scale-95 sm:size-10" aria-label={cartCount ? `Keranjang, ${cartCount} barang` : "Keranjang"} render={<Link href="/cart" />}>
                <ShoppingCart className="size-5 text-foreground/80" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm">
                    {cartCount > 99 ? "99+" : cartCount}
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
          "block select-none space-y-1 rounded-xl p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50 hover:text-accent-foreground focus:bg-muted focus:text-accent-foreground",
          className
        )}
      >
        <div className="text-sm font-medium leading-none">{title}</div>
        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
          {children}
        </p>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
