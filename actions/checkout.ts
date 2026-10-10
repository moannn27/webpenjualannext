'use server'

import { CheckoutService } from '@/services/checkout.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkoutSchema } from '@/validators/checkout.validator'
import { normalizeStorefrontSettings } from '@/lib/storefront-settings'

const checkoutService = new CheckoutService()

export async function proceedToCheckoutAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Validate form data
  const validated = checkoutSchema.safeParse({
    recipientName: formData.get('recipientName') ?? '',
    phone: formData.get('phone') ?? '',
    streetAddress: formData.get('streetAddress') ?? '',
    city: formData.get('city') ?? '',
    province: formData.get('province') ?? '',
    postalCode: formData.get('postalCode') ?? '',
    shippingMethod: formData.get('shippingMethod'),
    paymentMethod: formData.get('paymentMethod'),
  })
  if (!validated.success) {
    throw new Error(validated.error.issues.map((issue) => issue.message).join(", "))
  }

  if (validated.data.shippingMethod === 'pickup') {
    const { data: storefront, error } = await supabase.from('storefront_settings').select('settings').eq('id', 'main').maybeSingle()
    if (error) throw new Error('Informasi lokasi pickup belum bisa diperiksa. Coba lagi.')
    const sfSettings = normalizeStorefrontSettings(storefront?.settings ?? {})
    const hasAddress = Boolean(sfSettings.pickup_info.store_address.trim() || sfSettings.store.address.trim())
    if (!hasAddress) {
      throw new Error('Lokasi pickup belum diatur oleh admin. Silakan pilih pengiriman atau hubungi admin.')
    }
  }

  const voucherCode = (formData.get('voucherCode') as string | null)?.trim() || undefined
  const order = await checkoutService.checkout(user.id, validated.data, voucherCode)
  revalidatePath('/', 'layout')
  redirect(`/checkout/success?order_id=${order.id}`)
}
