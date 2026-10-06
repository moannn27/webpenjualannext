import { z } from 'zod'
import { PAYMENT_METHOD, SHIPPING_METHOD_CODES } from '@/types/checkout'

export const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(8).max(24).regex(/^[0-9+()\s-]+$/),
  streetAddress: z.string().trim().min(5).max(255),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  shippingMethod: z.enum(SHIPPING_METHOD_CODES),
  paymentMethod: z.literal(PAYMENT_METHOD),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>;
