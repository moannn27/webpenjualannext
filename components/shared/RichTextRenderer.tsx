"use client";

import React, { useMemo } from "react";
import { normalizeRichTextContent } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

interface RichTextRendererProps {
  content: string | null | undefined;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Komponen publik untuk merender konten HTML yang tersimpan dari RichTextEditor.
 * Selalu melalui sanitasi ketat untuk menjamin keamanan dari injeksi XSS,
 * serta secara otomatis mendukung fallback data lama yang masih berupa plain text.
 */
export function RichTextRenderer({
  content,
  className,
  fallback = null,
}: RichTextRendererProps) {
  const sanitizedHtml = useMemo(() => {
    return normalizeRichTextContent(content);
  }, [content]);

  if (!sanitizedHtml) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div
      className={cn("rich-content leading-relaxed text-foreground", className)}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

