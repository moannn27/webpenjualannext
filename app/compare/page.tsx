import Link from 'next/link'
import Image from 'next/image'
import { GitCompareArrows } from 'lucide-react'
import { getProductsByIdsAction } from '@/actions/product'
import { Button } from '@/components/ui/button'
import { collectLaptopSpecifications, compareValuesDiffer, LAPTOP_COMPARE_KEYS } from '@/lib/product-specifications'
import type { Metadata } from 'next'
import { normalizeCompareIds } from '@/lib/product-compare'

export const metadata: Metadata = {
  title: 'Bandingkan Spesifikasi Laptop & Produk',
  description: 'Bandingkan spesifikasi prosesor, RAM, penyimpanan, kartu grafis, dan layar produk laptop di Next Solution Store.',
  robots: {
    index: false,
    follow: true,
  },
}

const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

const getProductImage = (product: any) => {
  return product.product_images?.find((img: any) => img.is_primary)?.url ?? product.product_images?.[0]?.url ?? "https://images.unsplash.com/photo-1496181133206-80ce9b88a853"
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = normalizeCompareIds((await searchParams).ids)
  const fetched = ids.length ? await getProductsByIdsAction(ids).catch(() => []) : []
  const products = ids.map((id) => fetched.find((product) => product.id === id)).filter((product): product is NonNullable<typeof product> => Boolean(product))
  const specifications = products.map((product) => collectLaptopSpecifications(product.product_specifications ?? []))
  const rows: { label: string; values: (string | number | null)[] }[] = [
    { label: 'Harga', values: products.map((product) => Number(product.discount_price ?? product.price)) },
    ...LAPTOP_COMPARE_KEYS.map((key) => ({ label: key, values: specifications.map((spec) => spec[key]) })),
  ]
  const formatter = (label: string, value: string | number | null) => {
    if (value == null || value === '') return <span className="text-muted-foreground text-xs italic">Tidak tersedia</span>
    if (label === 'Harga' && typeof value === 'number') return <span className="font-bold text-foreground">{formatRupiah(value)}</span>
    return <span className="font-medium text-foreground">{String(value)}</span>
  }

  return (
    <main className="container mx-auto min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bandingkan Spesifikasi Produk</h1>
        <p className="mt-2 text-muted-foreground">
          Perbandingan spesifikasi teknis dan harga produk pilihan secara berdampingan. Kolom berwarna menunjukkan perbedaan spesifikasi.
        </p>
      </div>

      {products.length < 2 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center max-w-lg mx-auto">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <GitCompareArrows className="size-6" />
          </div>
          <h2 className="text-lg font-bold mb-1">Pilih Produk untuk Dibandingkan</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Pilih sedikitnya dua produk di katalog atau halaman utama dengan mengklik tombol &quot;Bandingkan&quot; pada kartu produk.
          </p>
          <Button render={<Link href="/products" />}>Kembali ke Katalog Produk</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 w-44 bg-muted/80 backdrop-blur-xs p-4 align-top font-semibold text-muted-foreground">
                  Produk & Spesifikasi
                </th>
                {products.map((product) => {
                  const imgUrl = getProductImage(product)
                  const price = Number(product.discount_price ?? product.price)
                  return (
                    <th key={product.id} className="min-w-60 p-4 align-top">
                      <div className="flex flex-col items-center text-center">
                        <Link href={`/product/${product.id}`} className="group mb-3 relative aspect-square w-32 overflow-hidden rounded-xl bg-background border p-2 flex items-center justify-center shadow-xs">
                          <Image
                            src={imgUrl}
                            alt={product.name}
                            fill
                            className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                            sizes="128px"
                          />
                        </Link>
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {product.brands?.name ?? 'Brand'}
                        </span>
                        <Link className="font-semibold text-primary hover:underline line-clamp-2 text-sm mb-2" href={`/product/${product.id}`}>
                          {product.name}
                        </Link>
                        <div className="mt-auto">
                          <span className="font-bold text-foreground text-base block">
                            {formatRupiah(price)}
                          </span>
                          {product.discount_price != null && (
                            <span className="text-xs text-muted-foreground line-through block">
                              {formatRupiah(Number(product.price))}
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const different = compareValuesDiffer(row.values)
                return (
                  <tr key={row.label} className="border-t hover:bg-muted/20 transition-colors">
                    <th className="sticky left-0 bg-background p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider border-r">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td
                        key={`${row.label}-${products[index].id}`}
                        className={`p-4 text-center ${different ? 'bg-amber-500/10 dark:bg-amber-500/15' : ''}`}
                      >
                        {formatter(row.label, value)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button variant="outline" render={<Link href="/products" />}>
          Pilih / Tambah Produk Lain
        </Button>
      </div>
    </main>
  )
}
