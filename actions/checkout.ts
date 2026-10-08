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

  const order = await checkoutService.checkout(user.id, validated.data)
  revalidatePath('/', 'layout')
  redirect(`/checkout/success?order_id=${order.id}`)
}
