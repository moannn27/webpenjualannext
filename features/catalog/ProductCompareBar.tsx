"use client";

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GitCompareArrows, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProductCompareStore } from '@/store/useProductCompareStore'

export function ProductCompareBar() {
  const pathname = usePathname()
  const ids = useProductCompareStore((state) => state.ids)
  const clear = useProductCompareStore((state) => state.clear)

  if (pathname === '/compare' || !ids.length) return null

  const href = `/compare?ids=${encodeURIComponent(ids.join(','))}`
  return (
    <aside
      aria-label="Produk untuk dibandingkan"
      className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-background/95 p-3.5 shadow-2xl backdrop-blur-md sm:inset-x-6 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GitCompareArrows className="size-4" />
        </div>
        <div className="text-sm">
          <span className="font-semibold">{ids.length}/3 produk dipilih</span>
          <span className="text-muted-foreground ml-1.5 hidden sm:inline">
            {ids.length < 2 ? "(pilih min. 2 untuk membandingkan)" : "siap dibandingkan"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {ids.length >= 2 ? (
          <Button size="sm" className="shadow-xs font-medium" render={<Link href={href} />}>
            Bandingkan Sekarang
          </Button>
        ) : (
          <Button size="sm" disabled variant="secondary" title="Pilih minimal 2 produk untuk melihat perbandingan">
            Bandingkan (Min. 2)
          </Button>
        )}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Kosongkan daftar perbandingan"
          title="Kosongkan daftar"
          onClick={clear}
        >
          <X className="size-4" />
        </Button>
      </div>
    </aside>
  )
}
