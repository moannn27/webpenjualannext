import Link from 'next/link'
import { getProductsByIdsAction } from '@/actions/product'
import { ProductCompareBar } from '@/features/catalog/ProductCompareBar'
import { Button } from '@/components/ui/button'
import { collectLaptopSpecifications, compareValuesDiffer, LAPTOP_COMPARE_KEYS } from '@/lib/product-specifications'
import type { Metadata } from 'next'
import { normalizeCompareIds } from '@/lib/product-compare'

export const metadata: Metadata = {
  title: 'Bandingkan Spesifikasi Laptop',
  description: 'Bandingkan spesifikasi prosesor, RAM, penyimpanan, kartu grafis, dan layar produk laptop di Next Solution Store.',
  robots: {
    index: false,
    follow: true,
  },
}

const formatRupiah = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)

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
    if (value == null || value === '') return <span className="text-muted-foreground">Tidak tersedia</span>
    if (label === 'Harga' && typeof value === 'number') return <span>{formatRupiah(value)}</span>
    return value
  }

  return <main className="container mx-auto min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
    <h1 className="text-3xl font-bold">Bandingkan laptop</h1>
    <p className="mb-8 mt-2 text-muted-foreground">Perbandingan memakai produk katalog yang dipilih berdasarkan ID produk.</p>
    {products.length < 2 ? <div className="rounded-2xl border border-dashed p-8 text-center"><p className="mb-4 text-muted-foreground">Pilih sedikitnya dua produk di katalog untuk membandingkan.</p><Button render={<Link href="/products" />}>Kembali ke katalog</Button></div> : <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead><tr className="bg-muted/50"><th className="sticky left-0 z-10 w-40 bg-muted p-4">Spesifikasi</th>{products.map((product) => <th key={product.id} className="min-w-52 p-4 align-top"><Link className="font-semibold text-primary hover:underline" href={`/product/${product.id}`}>{product.name}</Link><span className="mt-1 block text-xs font-normal text-muted-foreground">{product.brands?.name ?? 'Brand tidak tersedia'}</span></th>)}</tr></thead>
        <tbody>{rows.map((row) => { const different = compareValuesDiffer(row.values); return <tr key={row.label} className="border-t"><th className="sticky left-0 bg-background p-4 font-medium">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${products[index].id}`} className={`p-4 ${different ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>{row.label === 'Harga' && products[index].discount_price != null && <span className="mb-1 block text-xs text-muted-foreground line-through">{formatRupiah(Number(products[index].price))}</span>}{formatter(row.label, value)}</td>)}</tr> })}</tbody>
      </table>
    </div>}
    <div className="mt-6"><Button variant="outline" render={<Link href="/products" />}>Tambah atau ubah produk</Button></div>
    <ProductCompareBar />
  </main>
}
