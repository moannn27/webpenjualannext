import { describe, it, expect } from 'vitest'
import {
  generateCustomersCsv,
  generateCustomersExcel,
  generateCustomersWord,
  type ExportCustomerRow,
} from '@/lib/export-customers'

describe('Customer & Purchase Data Export Utility', () => {
  const sampleData: ExportCustomerRow[] = [
    {
      id: 'user-1',
      fullName: 'Budi Santoso',
      email: 'budi@example.com',
      phone: '081234567890',
      role: 'customer',
      createdAt: '2026-10-01T10:00:00.000Z',
      totalOrders: 3,
      completedOrders: 2,
      completedSpend: 15000000,
      lastOrderAt: '2026-10-10T12:00:00.000Z',
    },
    {
      id: 'user-2',
      fullName: 'Admin Toko',
      email: 'admin@nextsolution.com',
      phone: '08987654321',
      role: 'admin',
      createdAt: '2026-09-15T08:00:00.000Z',
      totalOrders: 0,
      completedOrders: 0,
      completedSpend: 0,
      lastOrderAt: null,
    },
  ]

  describe('generateCustomersCsv', () => {
    it('generates CSV with customer-only columns', async () => {
      const blob = generateCustomersCsv(sampleData, 'customers_only')
      const text = await blob.text()
      expect(text).toContain('ID Pengguna')
      expect(text).toContain('Budi Santoso')
      expect(text).toContain('budi@example.com')
      expect(text).toContain('Pelanggan')
      expect(text).not.toContain('Total Belanja (Rp)')
    })

    it('generates CSV with purchase history columns', async () => {
      const blob = generateCustomersCsv(sampleData, 'customers_with_orders')
      const text = await blob.text()
      expect(text).toContain('Total Pesanan')
      expect(text).toContain('Total Belanja (Rp)')
      expect(text).toContain('15000000')
    })
  })

  describe('generateCustomersWord', () => {
    it('generates Word HTML document with proper header and table structure', async () => {
      const blob = generateCustomersWord(sampleData, 'customers_only')
      const text = await blob.text()
      expect(text).toContain('Laporan Data Akun Pelanggan &amp; Staf')
      expect(text).toContain('Next Solution Store')
      expect(text).toContain('Budi Santoso')
      expect(text).toContain('<table>')
    })

    it('includes purchase columns in Word format when selected', async () => {
      const blob = generateCustomersWord(sampleData, 'customers_with_orders')
      const text = await blob.text()
      expect(text).toContain('Laporan Data Pelanggan &amp; Histori Pembelian')
      expect(text).toContain('Rp 15.000.000')
    })
  })

  describe('generateCustomersExcel', () => {
    it('generates Excel binary Blob with proper type', async () => {
      const blob = await generateCustomersExcel(sampleData, 'customers_only')
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(blob.size).toBeGreaterThan(1000)
    })

    it('generates Excel binary Blob for customers with orders', async () => {
      const blob = await generateCustomersExcel(sampleData, 'customers_with_orders')
      expect(blob.size).toBeGreaterThan(1000)
    })
  })
})

