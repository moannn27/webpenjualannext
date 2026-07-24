import { z } from 'zod'

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
})

export const updateCartQuantitySchema = z.object({
  itemId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().nonnegative(),
})
