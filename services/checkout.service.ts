import { CartRepository } from '@/repositories/cart.repository'
import { createClient } from '@/lib/supabase/server'

export class CheckoutService {
  private cartRepo = new CartRepository()

  async checkout(userId: string, addressId: string, courier: string, voucherCode?: string) {
    const supabase = await createClient()
    const cart = await this.cartRepo.getCart(userId)
    
    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      throw new Error("Cart is empty")
    }

    let totalAmount = 0
    for (const item of cart.cart_items) {
      const price = item.products.discount_price || item.products.price
      totalAmount += price * item.quantity
    }

    // Voucher logic (in JS for simplicity, though could also be moved to RPC)
    let discountAmount = 0
    let voucherId = null

    if (voucherCode) {
      const { data: voucher } = await supabase.from('vouchers')
        .select('*')
        .eq('code', voucherCode)
        .eq('is_active', true)
        .single()
      
      if (voucher) {
        const now = new Date()
        const startDate = voucher.start_date ? new Date(voucher.start_date) : null
        const endDate = voucher.end_date ? new Date(voucher.end_date) : null
        
        if (startDate && now < startDate) throw new Error("Voucher is not active yet")
        if (endDate && now > endDate) throw new Error("Voucher is expired")
        if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) throw new Error("Voucher limit reached")
        if (totalAmount < voucher.min_purchase) throw new Error(`Minimum purchase required: ${voucher.min_purchase}`)

        if (voucher.discount_type === 'percentage') {
          discountAmount = totalAmount * (voucher.discount_value / 100)
          if (voucher.max_discount && discountAmount > voucher.max_discount) {
            discountAmount = voucher.max_discount
          }
        } else {
          discountAmount = voucher.discount_value
        }
        
        voucherId = voucher.id
      } else {
        throw new Error("Invalid voucher code")
      }
    }

    const shippingAmount = 25000 // Dummy or calculated from courier

    // Execute Atomic Checkout Transaction
    const { data: orderId, error } = await supabase.rpc('process_checkout', {
      p_user_id: userId,
      p_address_id: addressId,
      p_courier: courier,
      p_shipping_amount: shippingAmount,
      p_discount_amount: discountAmount,
      p_voucher_id: voucherId
    })

    if (error) {
      throw new Error("Checkout failed: " + error.message)
    }

    return { id: orderId }
  }
}
