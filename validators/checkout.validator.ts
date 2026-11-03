import { z } from 'zod'
import { PAYMENT_METHODS, SHIPPING_METHOD_CODES } from '@/types/checkout'

export const checkoutSchema = z.object({
  recipientName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(8).max(24).regex(/^[0-9+()\s-]+$/),
  streetAddress: z.string().trim().max(255),
  city: z.string().trim().max(100),
  province: z.string().trim().max(100),
  postalCode: z.string().trim().max(20),
  shippingMethod: z.enum(SHIPPING_METHOD_CODES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  taxInvoiceRequested: z.boolean().optional(),
  taxCompanyName: z.string().trim().max(200).optional(),
  taxNpwp: z.string().trim().max(50).optional(),
  taxAddress: z.string().trim().max(300).optional(),
  taxPercent: z.number().optional(),
  taxAmount: z.number().optional(),
}).superRefine((data, context) => {
  if (data.taxInvoiceRequested) {
    if (!data.taxCompanyName || data.taxCompanyName.length < 2) {
      context.addIssue({ code: "custom", path: ["taxCompanyName"], message: "Nama perusahaan / badan usaha wajib diisi untuk faktur pajak." })
    }
    if (!data.taxNpwp || data.taxNpwp.length < 6) {
      context.addIssue({ code: "custom", path: ["taxNpwp"], message: "Nomor NPWP / NIK wajib diisi untuk faktur pajak." })
    }
  }
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
