import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { type CheckoutInput } from '@/validators/checkout.validator';
import { normalizeVoucherCode, calculateVoucherDiscount } from '@/lib/voucher';
import { normalizeStorefrontSettings } from '@/lib/storefront-settings';
import { getPhoneVariants } from '@/lib/phone';
import { type Voucher } from '@/types/voucher';

export class CheckoutService {
  async checkout(userId: string, input: CheckoutInput, voucherCode?: string): Promise<{ id: string }> {
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
        .select('id, cart_items(quantity, variant_id, products(id, name, price, discount_price, status, stock, category_id, brand_id, categories(id, name), brands(id, name)), product_variants(id, sku, price, discount_price, stock))')
        .eq('user_id', userId)
        .maybeSingle();

      if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
        throw new Error('Keranjang belanja kosong.');
      }

      type CartItemRecord = {
        quantity?: number | null
        variant_id?: string | null
        products?: {
          id?: string
          name?: string
          price?: number | null
          discount_price?: number | null
          status?: string | null
          stock?: number | null
          category_id?: string | null
          brand_id?: string | null
          categories?: { id?: string | null; name?: string | null } | null
          brands?: { id?: string | null; name?: string | null } | null
        } | null
        product_variants?: {
          id?: string
          sku?: string | null
          price?: number | null
          discount_price?: number | null
          stock?: number | null
        } | null
      }

      const cartSubtotal = (cart.cart_items as CartItemRecord[]).reduce((total: number, item: CartItemRecord) => {
        const itemPrice = Number(
          item.product_variants?.discount_price ??
          item.product_variants?.price ??
          item.products?.discount_price ??
          item.products?.price ?? 0
        );
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

      const cartItemsForVoucher = (cart.cart_items as CartItemRecord[]).map((ci: CartItemRecord) => ({
        product_id: ci.products?.id,
        price: Number(
          ci.product_variants?.discount_price ??
          ci.product_variants?.price ??
          ci.products?.discount_price ??
          ci.products?.price ?? 0
        ),
        quantity: Number(ci.quantity || 1),
        category_id: ci.products?.category_id,
        brand_id: ci.products?.brand_id,
        category_name: ci.products?.categories?.name,
        brand_name: ci.products?.brands?.name,
      }));

      const valResult = calculateVoucherDiscount(voucherWithTargeting, cartSubtotal, {
        items: cartItemsForVoucher,
        skipUsageLimitCheck: true,
      });

      if (!valResult.isValid) {
        throw new Error(valResult.error || 'Voucher tidak memenuhi syarat untuk keranjang ini.');
      }

      targetVoucher = voucherWithTargeting;
      expectedDiscount = valResult.discountAmount;
    }

    let reservationId: string | null = null;

    // Atomically claim voucher quota before checkout using server-only service_role
    // Returns a unique reservation ID bound to this user and voucher
    if (targetVoucher && expectedDiscount > 0) {
      const adminClient = getSupabaseAdminClient();
      const { data: claimResId, error: claimErr } = await adminClient.rpc('claim_voucher_quota', {
        p_voucher_id: targetVoucher.id,
        p_user_id: userId,
      });

      if (claimErr) {
        if (claimErr.code === 'PGRST202' || claimErr.message?.includes('claim_voucher_quota')) {
          throw new Error('Fungsi database claim_voucher_quota belum tersedia. Pemakaian voucher dibatalkan secara aman (fail-closed).');
        }
        throw new Error(`Gagal memproses klaim voucher: ${claimErr.message}`);
      }

      if (!claimResId) {
        throw new Error('Kuota pemakaian voucher ini sudah habis.');
      }

      reservationId = claimResId;
    }

    let orderId: string | null = null;
    try {
      // Call atomic checkout stored procedure
      const { data: rpcOrderId, error } = await supabase.rpc('process_checkout', {
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
      if (!rpcOrderId) throw new Error('Checkout did not return an order ID');
      orderId = rpcOrderId;

      // Apply voucher discount and update grand total on server
      if (targetVoucher && expectedDiscount > 0 && reservationId) {
        const adminClient = getSupabaseAdminClient();
        const { data: orderData, error: orderFetchErr } = await adminClient
          .from('orders')
          .select('total_amount, shipping_amount')
          .eq('id', orderId)
          .single();

        if (orderFetchErr || !orderData) {
          throw new Error('Gagal memverifikasi data pesanan untuk diskon voucher.');
        }

        const orderSubtotal = Number(orderData.total_amount);
        const shippingAmount = Number(orderData.shipping_amount);
        const actualDiscount = Math.min(expectedDiscount, orderSubtotal);
        const grandTotal = Math.max(0, orderSubtotal - actualDiscount) + shippingAmount;

        const { error: orderUpdateErr } = await adminClient
          .from('orders')
          .update({
            voucher_id: targetVoucher.id,
            discount_amount: actualDiscount,
            grand_total: grandTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (orderUpdateErr) {
          throw new Error(`Gagal menerapkan diskon voucher ke pesanan: ${orderUpdateErr.message}`);
        }

        // Mark voucher reservation as permanently consumed by this order
        const { data: consumed, error: consumeErr } = await adminClient.rpc('consume_voucher_reservation', {
          p_reservation_id: reservationId,
          p_order_id: orderId,
        });

        if (consumeErr || consumed === false) {
          throw new Error('Reservasi kuota voucher telah kadaluarsa atau tidak valid.');
        }

        const { error: paymentUpdateErr } = await adminClient
          .from('payments')
          .update({
            amount: grandTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', orderId);

        if (paymentUpdateErr) {
          throw new Error(`Gagal memperbarui tagihan pembayaran: ${paymentUpdateErr.message}`);
        }
      }

      return { id: orderId! };
    } catch (err: unknown) {
      const adminClient = getSupabaseAdminClient();

      if (orderId) {
        try {
          await adminClient.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        } catch (cancelErr) {
          console.error('Gagal membatalkan pesanan setelah error checkout:', cancelErr);
        }
      }

      // Safe, non-replayable release: only decrements if status is still 'reserved'
      if (reservationId) {
        try {
          await adminClient.rpc('release_voucher_reservation', {
            p_reservation_id: reservationId,
          });
        } catch (releaseErr) {
          console.error('Gagal melepaskan kuota voucher setelah error checkout:', releaseErr);
        }
      }

      throw err;
    }
  }
}

