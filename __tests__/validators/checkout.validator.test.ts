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
})