'use server'

import { CheckoutService } from '@/services/checkout.service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const checkoutService = new CheckoutService()

const addressSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address must be at least 5 characters").max(255),
  city: z.string().min(2, "City is required").max(100),
  postalCode: z.string().min(3, "Postal code is required").max(20),
  shipping: z.enum(['standard', 'express']).default('standard')
})

export async function proceedToCheckoutAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Validate form data
  const rawData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    address: formData.get('address'),
    city: formData.get('city'),
    postalCode: formData.get('postalCode'),
    shipping: formData.get('shipping') || 'standard'
  }
  
  const validated = addressSchema.safeParse(rawData)
  if (!validated.success) {
    throw new Error(validated.error.errors.map(e => e.message).join(", "))
  }
  const data = validated.data
  
  // Create an address record
  const { data: address, error } = await supabase.from('addresses').insert({
    user_id: user.id,
    label: 'Home',
    recipient_name: `${data.firstName} ${data.lastName}`,
    phone: '000000000', // Mock for now
    street_address: data.address,
    city: data.city,
    province: 'Province', // Mock for now
    postal_code: data.postalCode,
    is_primary: true
  }).select('id').single()

  if (error || !address) {
    throw new Error("Failed to create address: " + error?.message)
  }

  const order = await checkoutService.checkout(user.id, address.id, data.shipping)
  
  // Redirect to success
  redirect(`/checkout/success?order_id=${order.id}`)
}
