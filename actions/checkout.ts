'use server'

import { CheckoutService } from '@/services/checkout.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkoutSchema } from '@/validators/checkout.validator'
import { normalizeStorefrontSettings } from '@/lib/storefront-settings'

const checkoutService = new CheckoutService()

export type CheckoutActionResult =
  | {
      success: true
      orderId: string
      orderNumber: string
      grandTotal: number
      courier: string
      recipientName: string
      paymentMethod: string
    }
  | {
      success: false
      error: string
    }

export async function proceedToCheckoutAction(formData: FormData): Promise<CheckoutActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Sesi login telah berakhir. Silakan login kembali.' }
  }

  // Validate form data
  const taxRequested = formData.get('taxInvoiceRequested') === 'true' || formData.get('taxInvoiceRequested') === 'on'
  const validated = checkoutSchema.safeParse({
    recipientName: formData.get('recipientName') ?? '',
    phone: formData.get('phone') ?? '',
    streetAddress: formData.get('streetAddress') ?? '',
    city: formData.get('city') ?? '',
    province: formData.get('province') ?? '',
    postalCode: formData.get('postalCode') ?? '',
    shippingMethod: formData.get('shippingMethod'),
    paymentMethod: formData.get('paymentMethod'),
    taxInvoiceRequested: taxRequested,
    taxCompanyName: String(formData.get('taxCompanyName') ?? '').trim(),
    taxNpwp: String(formData.get('taxNpwp') ?? '').trim(),
    taxAddress: String(formData.get('taxAddress') ?? '').trim(),
    taxPercent: formData.get('taxPercent') ? Number(formData.get('taxPercent')) : undefined,
    taxAmount: formData.get('taxAmount') ? Number(formData.get('taxAmount')) : undefined,
  })
  if (!validated.success) {
    return { success: false, error: validated.error.issues.map((issue) => issue.message).join(', ') }
  }

  try {
    // Validate against storefront business rules & security constraints
    const { data: storefront, error } = await supabase.from('storefront_settings').select('settings').eq('id', 'main').maybeSingle()
    if (error) {
      return { success: false, error: 'Informasi pengaturan toko belum bisa diperiksa. Silakan coba lagi.' }
    }
    const sfSettings = normalizeStorefrontSettings(storefront?.settings ?? {})

    if (validated.data.shippingMethod === 'pickup') {
      const hasAddress = Boolean(sfSettings.pickup_info.store_address.trim() || sfSettings.store.address.trim())
      if (!hasAddress) {
        return { success: false, error: 'Lokasi pickup belum diatur oleh admin. Silakan pilih pengiriman atau hubungi admin.' }
      }
    }

    if (validated.data.paymentMethod === 'qris') {
      if (sfSettings.features.qris_enabled === false) {
        return { success: false, error: 'Metode pembayaran QRIS sedang dinonaktifkan oleh admin toko.' }
      }
      if (!sfSettings.features.qris_image_url || !sfSettings.features.qris_image_url.trim()) {
        return { success: false, error: 'Metode QRIS belum dapat digunakan karena kode QR toko belum dimasukkan oleh admin di pengaturan.' }
      }
    } else if (validated.data.paymentMethod === 'cash_on_pickup') {
      if (validated.data.shippingMethod !== 'pickup') {
        return { success: false, error: 'Metode bayar tunai di kasir (Cash on Pickup) hanya dapat digunakan untuk opsi Ambil Sendiri di Toko.' }
      }
      if (sfSettings.features.cash_payment_enabled === false) {
        return { success: false, error: 'Metode bayar tunai di kasir sedang dinonaktifkan oleh admin toko.' }
      }
    } else if (validated.data.paymentMethod === 'manual_transfer') {
      if (sfSettings.features.bank_transfer_enabled === false) {
        return { success: false, error: 'Metode transfer bank manual sedang dinonaktifkan oleh admin toko.' }
      }
    }

    const voucherCode = (formData.get('voucherCode') as string | null)?.trim() || undefined
    const order = await checkoutService.checkout(user.id, validated.data, voucherCode)

    const { data: createdOrder } = await supabase
      .from('orders')
      .select('id, order_number, grand_total, status, courier')
      .eq('id', order.id)
      .single()

    revalidatePath('/cart')
    revalidatePath('/profile')
    revalidatePath('/admin/orders')
    return {
      success: true,
      orderId: order.id,
      orderNumber: createdOrder?.order_number || '',
      grandTotal: Number(createdOrder?.grand_total || 0),
      courier: createdOrder?.courier || validated.data.shippingMethod,
      recipientName: validated.data.recipientName,
      paymentMethod: validated.data.paymentMethod,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Pesanan belum berhasil dibuat. Coba lagi.'
    return { success: false, error: errorMsg }
  }
}
