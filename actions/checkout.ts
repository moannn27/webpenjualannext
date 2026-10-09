'use server'

import { CheckoutService } from '@/services/checkout.service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkoutSchema } from '@/validators/checkout.validator'

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
    const settings = storefront?.settings as { pickup_info?: { store_address?: unknown } } | null
    if (typeof settings?.pickup_info?.store_address !== 'string' || !settings.pickup_info.store_address.trim()) {
      throw new Error('Lokasi pickup belum diatur. Silakan pilih pengiriman atau hubungi admin.')
    }
  }

  const order = await checkoutService.checkout(user.id, validated.data)
  revalidatePath('/', 'layout')
  redirect(`/checkout/success?order_id=${order.id}`)
}
