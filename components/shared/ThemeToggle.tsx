"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("next-solution-theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
    document.documentElement.style.colorScheme = saved ? "dark" : "light";
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    window.localStorage.setItem("next-solution-theme", next ? "dark" : "light");
  };
  return <Button type="button" variant="ghost" size="icon" className={className} onClick={toggle} aria-label={dark ? "Pakai mode terang" : "Pakai mode gelap"} title={dark ? "Mode terang" : "Mode gelap"}>{dark ? <Sun className="size-5" /> : <Moon className="size-5" />}</Button>;
}
