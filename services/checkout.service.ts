import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { type CheckoutInput } from '@/validators/checkout.validator';
import { normalizeVoucherCode, calculateVoucherDiscount } from '@/lib/voucher';
import { normalizeStorefrontSettings } from '@/lib/storefront-settings';
import { getPhoneVariants } from '@/lib/phone';
import { type Voucher } from '@/types/voucher';

export class CheckoutService {
  async checkout(userId: string, input: CheckoutInput, voucherCode?: string) {
    const supabase = await createClient();

    let targetVoucher: Voucher | null = null;
    let expectedDiscount = 0;

    // Server-side Voucher Validation & Anti-Abuse
    if (voucherCode && voucherCode.trim()) {
      const normalizedCode = normalizeVoucherCode(voucherCode);
      const [{ data: voucher, error: vErr }, { data: sfRow }] = await Promise.all([
        supabase
          .from('vouchers')
          .select('*')
          .eq('code', normalizedCode)
          .eq('is_active', true)
          .maybeSingle(),
        supabase.from('storefront_settings').select('settings').eq('id', 'main').maybeSingle(),
      ]);

      if (vErr || !voucher) {
        throw new Error('Kode voucher tidak ditemukan atau sedang tidak aktif.');
      }

      // Re-fetch cart items to verify server truth subtotal with categories & brands
      const { data: cart } = await supabase
        .from('cart')
        .select('id, cart_items(quantity, products(id, name, price, discount_price, status, stock, category_id, brand_id, categories(id, name), brands(id, name)))')
        .eq('user_id', userId)
        .maybeSingle();

      if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
        throw new Error('Keranjang belanja kosong.');
      }

      const cartSubtotal = cart.cart_items.reduce((total: number, item: any) => {
        const itemPrice = Number(item.products?.discount_price ?? item.products?.price ?? 0);
        return total + itemPrice * Number(item.quantity || 1);
      }, 0);

      const sfSettings = normalizeStorefrontSettings(sfRow?.settings ?? {});
      const targeting = sfSettings.voucher_targeting?.[voucher.id];

      const voucherWithTargeting: Voucher = {
        ...(voucher as Voucher),
        target_scope: targeting?.scope ?? 'all',
        applicable_categories: targeting?.category_ids ?? [],
        applicable_brands: targeting?.brand_ids ?? [],
        applicable_category_names: targeting?.category_names ?? [],
        applicable_brand_names: targeting?.brand_names ?? [],
        match_criteria: targeting?.match_criteria ?? 'all',
        is_new_customer_only: Boolean(targeting?.is_new_customer_only),
      };

      // Anti-abuse: First-time customer check
      if (voucherWithTargeting.is_new_customer_only) {
        const { count: priorUserOrders } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .neq('status', 'cancelled');

        if (priorUserOrders && priorUserOrders > 0) {
          throw new Error('Voucher ini khusus untuk transaksi pertama pengguna baru.');
        }

        if (input.phone) {
          const variants = getPhoneVariants(input.phone);
          const adminClient = getSupabaseAdminClient();
          const { data: usersWithPhone } = await adminClient
            .from('users')
            .select('id')
            .in('phone', variants);

          if (usersWithPhone && usersWithPhone.length > 0) {
            const userIds = usersWithPhone.map((u) => u.id);
            const { count: priorOrdersForPhone } = await adminClient
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .in('user_id', userIds)
              .neq('status', 'cancelled');

            if (priorOrdersForPhone && priorOrdersForPhone > 0) {
              throw new Error('Voucher ini khusus untuk transaksi pertama pengguna baru. Nomor HP ini sudah pernah digunakan dalam transaksi.');
            }
          }
        }
      }

      const cartItemsForVoucher = cart.cart_items.map((ci: any) => ({
        product_id: ci.products?.id,
        price: Number(ci.products?.discount_price ?? ci.products?.price ?? 0),
        quantity: Number(ci.quantity || 1),
        category_id: ci.products?.category_id,
        brand_id: ci.products?.brand_id,
        category_name: ci.products?.categories?.name,
        brand_name: ci.products?.brands?.name,
      }));

      const valResult = calculateVoucherDiscount(voucherWithTargeting, cartSubtotal, {
        items: cartItemsForVoucher,
      });

      if (!valResult.isValid) {
        throw new Error(valResult.error || 'Voucher tidak memenuhi syarat untuk keranjang ini.');
      }

      targetVoucher = voucherWithTargeting;
      expectedDiscount = valResult.discountAmount;
    }

    // Call atomic checkout stored procedure
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
    });

    if (error) throw new Error(error.message);
    if (!orderId) throw new Error('Checkout did not return an order ID');

    // Apply voucher discount and update usage count on server
    if (targetVoucher && expectedDiscount > 0) {
      const adminClient = getSupabaseAdminClient();
      const { data: orderData } = await adminClient
        .from('orders')
        .select('total_amount, shipping_amount')
        .eq('id', orderId)
        .single();

      if (orderData) {
        const orderSubtotal = Number(orderData.total_amount);
        const shippingAmount = Number(orderData.shipping_amount);
        const actualDiscount = Math.min(expectedDiscount, orderSubtotal);
        const grandTotal = Math.max(0, orderSubtotal - actualDiscount) + shippingAmount;

        await adminClient
          .from('orders')
          .update({
            voucher_id: targetVoucher.id,
            discount_amount: actualDiscount,
            grand_total: grandTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        await adminClient
          .from('payments')
          .update({
            amount: grandTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', orderId);

        await adminClient
          .from('vouchers')
          .update({
            usage_count: Number(targetVoucher.usage_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetVoucher.id);
      }
    }

    return { id: orderId };
  }
}
