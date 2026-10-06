"use client";

import * as React from "react";
import Link from "next/link";
import { Search, ShoppingCart, Heart, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
          <div className="flex items-center justify-end gap-2 flex-1 lg:flex-none lg:w-96">
            <div className="relative hidden sm:flex w-full max-w-sm items-center">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full bg-muted/50 border-none pl-9 rounded-full focus-visible:ring-1 focus-visible:ring-primary/50 transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex">
                <Heart className="h-5 w-5 text-foreground/80 hover:text-foreground transition-colors" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5 text-foreground/80 hover:text-foreground transition-colors" />
              </Button>
              <Button variant="ghost" size="icon" className="relative rounded-full text-foreground hover:bg-muted" render={<Link href="/cart" />}>
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartCount}
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
