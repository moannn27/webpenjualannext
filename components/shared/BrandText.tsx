"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BrandTextProps {
  storeName?: string;
  word1?: string;
  word2?: string;
  word1Color?: string;
  word2Color?: string;
  className?: string;
  nextClassName?: string;
  solutionClassName?: string;
  isItalic?: boolean;
}

/**
 * Komponen BrandText resmi Next Solution:
 * Mendukung warna kustom per kata (default kata 1: "NEXT" merah #DC2626, kata 2: "SOLUTION" biru #0048BA)
 * bergaya tebal italic sesuai identitas logo resmi toko.
 */
export function BrandText({
  storeName = "Next Solution",
  word1,
  word2,
  word1Color = "#DC2626",
  word2Color = "#0048BA",
  className,
  nextClassName,
  solutionClassName,
  isItalic = true,
}: BrandTextProps) {
  // Jika kata 1 dan kata 2 diberikan secara eksplisit
  if (word1 !== undefined || word2 !== undefined) {
    const w1 = word1 ?? "NEXT";
    const w2 = word2 ?? "SOLUTION";
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1.5 tracking-tight font-black select-none",
          isItalic && "italic",
          className
        )}
      >
        <span style={{ color: word1Color }} className={nextClassName}>
          {w1}
        </span>
        {w2 && (
          <span style={{ color: word2Color }} className={solutionClassName}>
            {w2}
          </span>
        )}
      </span>
    );
  }

  const normalized = (storeName || "").trim();
  const isDefaultBrand = /^next\s*solution(\s*store)?$/i.test(normalized);

  if (isDefaultBrand) {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1.5 tracking-tight font-black select-none",
          isItalic && "italic",
          className
        )}
      >
        <span style={{ color: word1Color }} className={cn("text-[#DC2626]", nextClassName)}>
          NEXT
        </span>
        <span style={{ color: word2Color }} className={cn("text-[#0048BA]", solutionClassName)}>
          SOLUTION
        </span>
      </span>
    );
  }

  // Jika nama toko custom
  return (
    <span className={cn("font-bold tracking-tight text-primary", className)}>
      {storeName}
    </span>
  );
}
