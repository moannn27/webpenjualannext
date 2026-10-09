export type ImportedVariant = { sku: string; color: string; ram: string; storage: string; price: number | null; discount_price: number | null; stock: number }
export type ImportedProduct = {
  name: string; sku: string; description: string; price: number; discount_price: number | null; stock: number
  category: string; brand: string; status: 'published' | 'draft' | 'archived'; is_best_seller: boolean; is_new_arrival: boolean
  image_url: string; specifications: { key: string; value: string; display_order: number }[]; variants: ImportedVariant[]
}

const headers = ['product_name','sku','description','price','discount_price','stock','category','brand','status','is_best_seller','is_new_arrival','image_url','specifications','color','ram','storage','variant_sku','variant_price','variant_discount_price','variant_stock'] as const
const aliases: Record<string, string> = {
  product_name:'product_name', name:'product_name', nama:'product_name', nama_produk:'product_name', produk:'product_name',
  sku:'sku', product_sku:'sku', description:'description', deskripsi:'description',
  price:'price', harga:'price', discount_price:'discount_price', harga_diskon:'discount_price',
  stock:'stock', stok:'stock', category:'category', kategori:'category', brand:'brand', merek:'brand', merk:'brand',
  status:'status', is_best_seller:'is_best_seller', best_seller:'is_best_seller', is_new_arrival:'is_new_arrival', new_arrival:'is_new_arrival',
  image_url:'image_url', foto:'image_url', url_foto:'image_url', specifications:'specifications', spesifikasi:'specifications',
  color:'color', warna:'color', ram:'ram', storage:'storage', penyimpanan:'storage', variant_sku:'variant_sku', sku_varian:'variant_sku',
  variant_price:'variant_price', harga_varian:'variant_price', variant_discount_price:'variant_discount_price', harga_diskon_varian:'variant_discount_price',
  variant_stock:'variant_stock', stok_varian:'variant_stock',
}
const cleanHeader = (v: string) => v.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const text = (v: unknown) => String(v ?? '').trim()
function money(value: string, label: string, row: number, optional = false): number | null {
  if (!value && optional) return null
  const normalized = value.replace(/[\s.,](?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) throw new Error(`Baris ${row}: ${label} harus angka nol atau lebih.`)
  return n
}
function integer(value: string, label: string, row: number, optional = false): number | null {
  if (!value && optional) return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) throw new Error(`Baris ${row}: ${label} harus bilangan bulat nol atau lebih.`)
  return n
}
const bool = (v: string) => ['true','1','yes','ya','iya','on'].includes(v.trim().toLowerCase())

export function normalizeProductRows(rows: string[][]): ImportedProduct[] {
  if (rows.length > 2001) throw new Error('File terlalu banyak baris. Maksimal 2.000 baris data.')
  const headerIndex = rows.slice(0, 20).findIndex((row) => row.map((cell) => aliases[cleanHeader(cell)]).filter(Boolean).includes('product_name') && row.map((cell) => aliases[cleanHeader(cell)]).filter(Boolean).includes('price'))
  if (headerIndex < 0) throw new Error('Header template tidak ditemukan. Unduh template CSV lalu isi kolom yang tersedia.')
  const headerRow = rows[headerIndex]
  const columns = headerRow.map((cell) => aliases[cleanHeader(cell)] ?? '')
  const mapped = rows.slice(headerIndex + 1).map((row, index) => {
    const record: Record<string, string> = {}
    columns.forEach((key, i) => { if (key && record[key] === undefined) record[key] = text(row[i]) })
    return { record, rowNumber: headerIndex + index + 2 }
  }).filter(({ record }) => Object.values(record).some(Boolean))
  if (!mapped.length) throw new Error('Tidak ada baris produk setelah header template.')

  const grouped = new Map<string, ImportedProduct>()
  for (const { record: r, rowNumber } of mapped) {
    const name = r.product_name ?? ''
    const brand = r.brand ?? ''
    const category = r.category ?? ''
    const description = r.description ?? ''
    if (!name || !brand || !category || !description) throw new Error(`Baris ${rowNumber}: nama, deskripsi, kategori, dan brand wajib diisi.`)
    const price = money(r.price ?? '', 'Harga', rowNumber)!
    const discount = money(r.discount_price ?? '', 'Harga diskon', rowNumber, true)
    if (discount !== null && discount >= price) throw new Error(`Baris ${rowNumber}: harga diskon harus lebih rendah dari harga.`)
    const sku = r.sku ?? ''
    const key = sku ? `sku:${sku.toLowerCase()}` : `name:${name.toLowerCase()}|${brand.toLowerCase()}`
    const status = (r.status || 'published').toLowerCase() as ImportedProduct['status']
    if (!['published','draft','archived'].includes(status)) throw new Error(`Baris ${rowNumber}: status harus published, draft, atau archived.`)
    let product = grouped.get(key)
    if (!product) {
      const imageUrl = r.image_url ?? ''
      if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error(`Baris ${rowNumber}: URL foto harus menggunakan HTTPS.`)
      const specifications = (r.specifications ?? '').split(/[;\n]/).map((part) => {
        const [k, ...v] = part.split(':')
        return { key: text(k), value: text(v.join(':')), display_order: 0 }
      }).filter((spec) => spec.key && spec.value)
      product = { name, sku, description, price, discount_price: discount, stock: 0, category, brand, status, is_best_seller: bool(r.is_best_seller ?? ''), is_new_arrival: bool(r.is_new_arrival ?? ''), image_url: imageUrl, specifications, variants: [] }
      grouped.set(key, product)
    } else if (product.name !== name || product.brand.toLowerCase() !== brand.toLowerCase() || product.category.toLowerCase() !== category.toLowerCase() || product.price !== price) {
      throw new Error(`Baris ${rowNumber}: data produk harus konsisten di semua baris varian.`)
    }
    const color = r.color ?? '', ram = r.ram ?? '', storage = r.storage ?? ''
    if (color || ram || storage || r.variant_stock) {
      if (!color && !ram && !storage) throw new Error(`Baris ${rowNumber}: varian harus memiliki warna, RAM, atau storage.`)
      const variantStock = integer(r.variant_stock ?? '', 'Stok varian', rowNumber)!
      const variantPrice = money(r.variant_price ?? '', 'Harga varian', rowNumber, true)
      const variantDiscount = money(r.variant_discount_price ?? '', 'Harga diskon varian', rowNumber, true)
      if (variantDiscount !== null && variantDiscount >= (variantPrice ?? price)) throw new Error(`Baris ${rowNumber}: diskon varian harus lebih rendah dari harga varian.`)
      if (product.variants.some((v) => v.color.toLowerCase() === color.toLowerCase() && v.ram.toLowerCase() === ram.toLowerCase() && v.storage.toLowerCase() === storage.toLowerCase())) throw new Error(`Baris ${rowNumber}: kombinasi varian produk ganda.`)
      product.variants.push({ sku: r.variant_sku ?? '', color, ram, storage, price: variantPrice, discount_price: variantDiscount, stock: variantStock })
    } else {
      product.stock = integer(r.stock ?? '', 'Stok', rowNumber)!
    }
  }
  if (grouped.size > 500) throw new Error('Maksimal 500 produk per impor.')
  const variantSkus = [...grouped.values()].flatMap((product) => product.variants.map((variant) => variant.sku.toLowerCase()).filter(Boolean))
  if (new Set(variantSkus).size !== variantSkus.length) throw new Error('SKU varian tidak boleh digunakan lebih dari satu kali dalam file.')
  for (const product of grouped.values()) if (product.variants.length > 50) throw new Error(`Produk ${product.name} memiliki lebih dari 50 varian. Bagi impor menjadi beberapa file.`)
  return [...grouped.values()]
}

export const productImportHeaders = [...headers]
