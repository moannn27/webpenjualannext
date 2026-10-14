import { describe, it, expect } from 'vitest'
import {
  generateSalesCsv,
  generateSalesExcel,
  generateSalesWord,
  generateSalesPdfHtml,
} from '@/lib/export-sales'
import type { AdminSaleItemDetail } from '@/actions/admin'

describe('Sales Data Export Utility (Excel, Word, PDF, CSV)', () => {
  const sampleDetails: AdminSaleItemDetail[] = [
    {
      id: 'item-1',
      orderId: 'ord-1',
      orderNumber: 'ORD-20261014-01',
      orderCreatedAt: '2026-10-14T10:30:00Z',
      day: '2026-10-14',
      time: '10:30 WIB',
      orderStatus: 'completed',
      customerName: 'Moan Dabest',
      customerPhone: '08123456789',
      productId: 'prod-1',
      productName: 'Yoga 7 2-in-1 14ILL10',
      variantDetails: 'Seashell / 16GB / 512GB',
      brandName: 'Lenovo',
      categoryName: 'Laptops',
      price: 22999000,
      quantity: 1,
      subtotal: 22999000,
      grandTotal: 22999000,
    },
    {
      id: 'item-2',
      orderId: 'ord-2',
      orderNumber: 'ORD-20261014-02',
      orderCreatedAt: '2026-10-14T14:15:00Z',
      day: '2026-10-14',
      time: '14:15 WIB',
      orderStatus: 'completed',
      customerName: 'Budi Santoso',
      customerPhone: '08987654321',
      productId: 'prod-2',
      productName: 'Ideapad Slim 3',
      variantDetails: 'Abyss Blue / 8GB / 512GB',
      brandName: 'Lenovo',
      categoryName: 'Laptops',
      price: 8500000,
      quantity: 2,
      subtotal: 17000000,
      grandTotal: 17000000,
    },
  ]

  describe('generateSalesCsv', () => {
    it('creates a CSV blob with correct header and escaped rows', async () => {
      const blob = generateSalesCsv('2026-10-14', sampleDetails)
      const text = await blob.text()

      expect(text).toContain('No Pesanan')
      expect(text).toContain('ORD-20261014-01')
      expect(text).toContain('Yoga 7 2-in-1 14ILL10')
      expect(text).toContain('Moan Dabest')
      expect(text).toContain('22999000')
      expect(text).toContain('Budi Santoso')
      expect(text).toContain('17000000')
    })
  })

  describe('generateSalesExcel', () => {
    it('creates an Excel XLSX blob with spreadsheet workbook structure', async () => {
      const blob = await generateSalesExcel('2026-10-14', sampleDetails)
      expect(blob.size).toBeGreaterThan(1000)
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })
  })

  describe('generateSalesWord', () => {
    it('creates a Word DOC HTML blob containing order table and store header', async () => {
      const blob = generateSalesWord('2026-10-14', sampleDetails)
      const text = await blob.text()

      expect(text).toContain('LAPORAN PENJUALAN - 2026-10-14')
      expect(text).toContain('ORD-20261014-01')
      expect(text).toContain('Yoga 7 2-in-1 14ILL10')
      expect(text).toContain('Rp 22.999.000')
      expect(text).toContain('Next Solution Store')
    })
  })

  describe('generateSalesPdfHtml', () => {
    it('generates responsive A4 print HTML with summary cards and item list', () => {
      const html = generateSalesPdfHtml('2026-10-14', sampleDetails)

      expect(html).toContain('NEXT SOLUTION STORE')
      expect(html).toContain('ORD-20261014-01')
      expect(html).toContain('ORD-20261014-02')
      expect(html).toContain('Rp 22.999.000')
      expect(html).toContain('Rp 17.000.000')
      expect(html).toContain('window.print()')
    })
  })
})

