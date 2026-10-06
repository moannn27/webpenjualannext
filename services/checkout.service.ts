import { createClient } from '@/lib/supabase/server'
import { type CheckoutInput } from '@/validators/checkout.validator'

export class CheckoutService {
  async checkout(userId: string, input: CheckoutInput) {
    const supabase = await createClient()
    const { data: orderId, error } = await supabase.rpc('process_checkout', {
      p_user_id: userId,
      p_recipient_name: input.recipientName,
      p_phone: input.phone,
      p_street_address: input.streetAddress,
      p_city: input.city,
      p_province: input.province,
      p_postal_code: input.postalCode,
      p_shipping_method: input.shippingMethod,
      p_payment_method: input.paymentMethod,
    })

    if (error) throw new Error(error.message)
    if (!orderId) throw new Error("Checkout did not return an order ID")

    return { id: orderId }
  }
}
