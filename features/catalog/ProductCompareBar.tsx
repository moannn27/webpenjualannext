"use client";

import Link from 'next/link'
import { GitCompareArrows, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProductCompareStore } from '@/store/useProductCompareStore'

export function ProductCompareBar() {
  const ids = useProductCompareStore((state) => state.ids)
  const clear = useProductCompareStore((state) => state.clear)
  if (!ids.length) return null
  const href = `/compare?ids=${encodeURIComponent(ids.join(','))}`
  return <aside aria-label="Produk untuk dibandingkan" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur sm:inset-x-6">
    <span className="flex items-center gap-2 text-sm font-medium"><GitCompareArrows className="size-4 text-primary" />{ids.length}/3 produk dipilih</span>
    <div className="flex items-center gap-2">{ids.length >= 2 ? <Button size="sm" render={<Link href={href} />}>Bandingkan</Button> : <Button size="sm" disabled>Bandingkan</Button>}<Button type="button" size="icon-sm" variant="ghost" aria-label="Kosongkan daftar perbandingan" onClick={clear}><X className="size-4" /></Button></div>
  </aside>
}
