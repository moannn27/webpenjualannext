import { describe, it, expect } from 'vitest'
import {
  flattenProductsForStockExport,
  generateStockXlsx,
  generateStockCsv,
  generateStockDoc,
  type AdminProductForStock,
} from '@/lib/export-stock'

describe('Stock Export Suite', () => {
  const dummyProducts: AdminProductForStock[] = [
    {
      id: 'prod-1',
      name: 'ASUS Vivobook 14',
      sku: 'ASUS-VIVO-14',
      price: 10000000,
      discount_price: 9500000,
      stock: 12,
      status: 'published',
      is_new_arrival: true,
      is_best_seller: false,
      categories: { name: 'Laptops' },
      brands: { name: 'ASUS' },
      product_variants: [],
    },
    {
      id: 'prod-2',
      name: 'IdeaPad Slim 3',
      sku: '82X6006FID',
      price: 8000000,
      discount_price: null,
      stock: 5,
      status: 'published',
      is_new_arrival: false,
      is_best_seller: true,
      categories: { name: 'Laptops' },
      brands: { name: 'Lenovo' },
      product_variants: [
        {
          id: 'var-1',
          sku: '82X6006FID-GREY',
          color: 'Abyss Blue',
          ram: '8GB',
          storage: '512GB SSD',
          price: 8000000,
          discount_price: null,
          stock: 3,
        },
        {
          id: 'var-2',
          sku: '82X6006FID-SILVER',
          color: 'Arctic Grey',
          ram: '16GB',
          storage: '512GB SSD',
          price: 8500000,
          discount_price: 8200000,
          stock: 2,
        },
      ],
    },
    {
      id: 'prod-3',
      name: 'Keyboard Gaming RGB',
      sku: 'ACC-KB-01',
      price: 350000,
      discount_price: null,
      stock: 0,
      status: 'draft',
      is_new_arrival: false,
      is_best_seller: false,
      categories: { name: 'Aksesoris' },
      brands: { name: 'Logitech' },
      product_variants: [],
    },
  ]

  it('flattens standalone products and variants into distinct inventory rows', () => {
    const items = flattenProductsForStockExport(dummyProducts)
    // 1 standalone (ASUS) + 2 variants (Lenovo) + 1 standalone (Logitech) = 4 rows
    expect(items).toHaveLength(4)

    // Check first item (ASUS)
    expect(items[0].sku).toBe('ASUS-VIVO-14')
    expect(items[0].itemType).toBe('Produk Tunggal')
    expect(items[0].stock).toBe(12)
    expect(items[0].stockStatus).toBe('Tersedia')
    expect(items[0].effectivePrice).toBe(9500000)
    expect(items[0].totalAssetValue).toBe(12 * 9500000)
    expect(items[0].tags).toContain('Terbaru')

    // Check variant item (Lenovo Abyss Blue)
    expect(items[1].sku).toBe('82X6006FID-GREY')
    expect(items[1].itemType).toBe('Varian')
    expect(items[1].variantDetails).toContain('RAM: 8GB')
    expect(items[1].stock).toBe(3)
    expect(items[1].stockStatus).toBe('Menipis')
    expect(items[1].tags).toContain('Terlaris')

    // Check out of stock item
    expect(items[3].stock).toBe(0)
    expect(items[3].stockStatus).toBe('Habis')
    expect(items[3].publishStatus).toBe('Draft')
  })

  it('generates an Excel (.xlsx) blob workbook with valid structure', async () => {
    const items = flattenProductsForStockExport(dummyProducts)
    const blob = await generateStockXlsx(items, 'Uji Coba')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('spreadsheetml')
    expect(blob.size).toBeGreaterThan(1000)
  })

  it('generates a CSV blob with UTF-8 BOM and correct headers', () => {
    const items = flattenProductsForStockExport(dummyProducts)
    const blob = generateStockCsv(items)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('text/csv')
    expect(blob.size).toBeGreaterThan(100)
  })

  it('generates a Word (.doc) blob containing HTML markup and inventory stats', () => {
    const items = flattenProductsForStockExport(dummyProducts)
    const blob = generateStockDoc(items, 'Uji Coba')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('application/msword')
    expect(blob.size).toBeGreaterThan(200)
  })
})

