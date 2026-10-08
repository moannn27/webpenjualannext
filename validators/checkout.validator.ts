import { z } from 'zod'
import { PAYMENT_METHOD, SHIPPING_METHOD_CODES } from '@/types/checkout'

export const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(8).max(24).regex(/^[0-9+()\s-]+$/),
  streetAddress: z.string().trim().max(255),
  city: z.string().trim().max(100),
  province: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  shippingMethod: z.enum(SHIPPING_METHOD_CODES),
  paymentMethod: z.literal(PAYMENT_METHOD),
}).superRefine((data, context) => {
  if (data.shippingMethod === "pickup") return
  const fields = [
    ["streetAddress", data.streetAddress, 5, "Alamat lengkap minimal 5 karakter."],
    ["city", data.city, 2, "Kota/kabupaten minimal 2 karakter."],
    ["province", data.province, 2, "Provinsi minimal 2 karakter."],
    ["postalCode", data.postalCode, 3, "Kode pos minimal 3 karakter."],
  ] as const
  for (const [path, value, minimum, message] of fields) {
    if (value.length < minimum) context.addIssue({ code: "custom", path: [path], message })
  }
})

export type CheckoutInput = z.infer<typeof checkoutSchema>;
