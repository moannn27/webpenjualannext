import { describe, expect, it } from 'vitest'
import { checkoutSchema } from '@/validators/checkout.validator'

const validCheckout = {
  recipientName: 'Rina Putri',
  phone: '+6281234567890',
  streetAddress: 'Jl. Merdeka No. 10',
  city: 'Bandung',
  province: 'Jawa Barat',
  postalCode: '40115',
  shippingMethod: 'standard',
  paymentMethod: 'manual_transfer',
}

describe('checkoutSchema', () => {
  it('accepts a complete delivery address and supported methods', () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true)
  })

  it('accepts qris and cash_on_pickup payment methods', () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, paymentMethod: 'qris' }).success).toBe(true)
    expect(checkoutSchema.safeParse({ ...validCheckout, shippingMethod: 'pickup', paymentMethod: 'cash_on_pickup' }).success).toBe(true)
  })

  it('rejects an invalid phone number and unsupported shipping method', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      phone: 'call me',
      shippingMethod: 'overnight',
    })

    expect(result.success).toBe(false)
  })

  it('does not accept client-selected card payment', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      paymentMethod: 'credit_card',
    })

    expect(result.success).toBe(false)
  })

  it('validates B2B tax invoice fields when requested', () => {
    // Valid tax invoice request
    const validTax = checkoutSchema.safeParse({
      ...validCheckout,
      taxInvoiceRequested: true,
      taxCompanyName: 'CV Next Solution ',
      taxNpwp: '01.234.567.8-012.000',
      taxAddress: 'Jl. KARTINI  NO . 09',
    })
    expect(validTax.success).toBe(true)

    // Rejects if taxInvoiceRequested is true but company name is missing
    const missingCompany = checkoutSchema.safeParse({
      ...validCheckout,
      taxInvoiceRequested: true,
      taxCompanyName: '',
      taxNpwp: '01.234.567.8-012.000',
    })
    expect(missingCompany.success).toBe(false)

    // Rejects if taxInvoiceRequested is true but NPWP is too short
    const shortNpwp = checkoutSchema.safeParse({
      ...validCheckout,
      taxInvoiceRequested: true,
      taxCompanyName: 'PT Test',
      taxNpwp: '123',
    })
    expect(shortNpwp.success).toBe(false)

    // Accepts when taxInvoiceRequested is false without any tax fields
    const notRequested = checkoutSchema.safeParse({
      ...validCheckout,
      taxInvoiceRequested: false,
    })
    expect(notRequested.success).toBe(true)
  })
})
