"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener("theme-change", onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener("theme-change", onChange);
      };
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    window.localStorage.setItem("next-solution-theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("theme-change"));
  };
  return <Button type="button" variant="ghost" size="icon" className={className} onClick={toggle} aria-label={dark ? "Pakai mode terang" : "Pakai mode gelap"} title={dark ? "Mode terang" : "Mode gelap"}>{dark ? <Sun className="size-5" /> : <Moon className="size-5" />}</Button>;
}
