"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  storeName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withLink?: boolean;
}

/**
 * Komponen BrandLogo resmi Next Solution:
 * Menampilkan logo resmi kombinasi lengkap:
 * - Atas: Lambang S di sebelah kiri + "NEXT" berwarna merah di sebelah kanan
 * - Bawah: "SOLUTION" berwarna biru membentang di bawah
 * Gambar menggunakan aset resmi HD transparan di /brand/next-solution-logo.png.
 */
export function BrandLogo({
  className,
  imageClassName,
  storeName = "Next Solution",
  size = "md",
  withLink = false,
}: BrandLogoProps) {
  const isDefaultBrand = /^next\s*solution(\s*store)?$/i.test(storeName || "");

  const heightClasses = {
    sm: "h-8",
    md: "h-9 sm:h-10",
    lg: "h-11 sm:h-12",
    xl: "h-14 sm:h-16",
  }[size];

  const content = isDefaultBrand ? (
    <div className={cn("inline-flex items-center select-none", className)}>
      <Image
        src="/brand/next-solution-logo.png"
        alt={storeName}
        width={160}
        height={60}
        unoptimized
        priority
        className={cn("w-auto object-contain", heightClasses, imageClassName)}
      />
    </div>
  ) : (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/brand/next-solution-symbol.png"
        alt={storeName}
        width={36}
        height={36}
        unoptimized
        className="size-8 object-contain shrink-0"
      />
      <span className="text-xl font-bold tracking-tight text-primary">
        {storeName}
      </span>
    </div>
  );

  if (withLink) {
    return (
      <Link href="/" className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}

