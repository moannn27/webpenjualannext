import { z } from 'zod'

export const checkoutSchema = z.object({
  addressId: z.string().uuid(),
  courier: z.string().min(1),
  voucherCode: z.string().optional(),
})
