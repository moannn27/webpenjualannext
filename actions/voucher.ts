'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireModulePermission } from '@/lib/auth/permissions';
import { calculateVoucherDiscount, normalizeVoucherCode, formatVoucherLabel } from '@/lib/voucher';
import { normalizeStorefrontSettings } from '@/lib/storefront-settings';
import { recordAdminActivity } from '@/lib/audit-log';
import { getPhoneVariants } from '@/lib/phone';
import {
  type Voucher,
  type VoucherItemInput,
  type VoucherTargeting,
  type VoucherTargetScope,
  type VoucherMatchCriteria,
} from '@/types/voucher';
import { revalidatePath } from 'next/cache';

export async function validateVoucherForCheckoutAction(
  code: string,
  currentSubtotal: number,
  cartItems?: VoucherItemInput[],
  phone?: string
) {
  const normalized = normalizeVoucherCode(code);
  if (!normalized) {
    return { success: false, error: 'Silakan ketik kode voucher.' };
  }

  if (typeof currentSubtotal !== 'number' || currentSubtotal < 0) {
    return { success: false, error: 'Subtotal pesanan tidak valid.' };
  }

  const supabase = await createClient();
  const [{ data: voucher, error }, { data: sfRow }] = await Promise.all([
    supabase
      .from('vouchers')
      .select('*')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('storefront_settings').select('settings').eq('id', 'main').maybeSingle(),
  ]);

  if (error || !voucher) {
    return { success: false, error: 'Kode voucher tidak ditemukan atau sudah tidak aktif.' };
  }

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

  // Anti-abuse: First-Time Buyer Voucher Check
  if (voucherWithTargeting.is_new_customer_only) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { count: priorUserOrders } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      if (priorUserOrders && priorUserOrders > 0) {
        return {
          success: false,
          error: 'Voucher ini khusus untuk transaksi pertama pengguna baru.',
        };
      }
    }

    // Check phone number anti-abuse (prevents multi-account abuse with same phone)
    const phoneToCheck = phone?.trim() || '';
    if (phoneToCheck) {
      const variants = getPhoneVariants(phoneToCheck);
      try {
        const adminClient = getSupabaseAdminClient();
        const { data: usersWithPhone } = await adminClient
          .from('users')
          .select('id')
          .in('phone', variants);

        if (usersWithPhone && usersWithPhone.length > 0) {
          const userIds = usersWithPhone.map((u) => u.id);
          const { count: priorOrders } = await adminClient
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('user_id', userIds)
            .neq('status', 'cancelled');

          if (priorOrders && priorOrders > 0) {
            return {
              success: false,
              error: 'Voucher ini khusus untuk transaksi pertama pengguna baru. Nomor HP ini sudah pernah digunakan dalam transaksi sebelumnya.',
            };
          }
        }
      } catch {
        // Continue if admin client unavailable in test environment
      }
    }
  }

  // If items not provided by client, try resolving from user's active database cart
  let itemsToEvaluate = cartItems;
  if (!itemsToEvaluate || itemsToEvaluate.length === 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: cart } = await supabase
        .from('cart')
        .select('id, cart_items(quantity, products(id, name, price, discount_price, category_id, brand_id, categories(id, name), brands(id, name)))')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cart?.cart_items) {
        itemsToEvaluate = cart.cart_items.map((ci: any) => ({
          product_id: ci.products?.id,
          price: Number(ci.products?.discount_price ?? ci.products?.price ?? 0),
          quantity: Number(ci.quantity || 1),
          category_id: ci.products?.category_id,
          brand_id: ci.products?.brand_id,
          category_name: ci.products?.categories?.name,
          brand_name: ci.products?.brands?.name,
        }));
      }
    }
  }

  const result = calculateVoucherDiscount(voucherWithTargeting, currentSubtotal, { items: itemsToEvaluate });
  if (!result.isValid) {
    return { success: false, error: result.error || 'Voucher tidak dapat digunakan untuk pesanan ini.' };
  }

  return {
    success: true,
    voucherCode: voucher.code,
    voucherId: voucher.id,
    discountAmount: result.discountAmount,
    description: voucher.description || formatVoucherLabel(voucherWithTargeting),
    minPurchase: Number(voucher.min_purchase || 0),
    discountType: voucher.discount_type as 'fixed_amount' | 'percentage',
    discountValue: Number(voucher.discount_value),
    maxDiscount: voucher.max_discount ? Number(voucher.max_discount) : null,
    targetScope: voucherWithTargeting.target_scope,
    applicableCategoryNames: voucherWithTargeting.applicable_category_names,
    applicableBrandNames: voucherWithTargeting.applicable_brand_names,
    eligibleSubtotal: result.eligibleSubtotal,
    isNewCustomerOnly: voucherWithTargeting.is_new_customer_only,
  };
}

export async function getAdminVouchersAction(): Promise<Voucher[]> {
  await requireModulePermission('vouchers');
  const supabase = await createClient();
  const [{ data, error }, { data: sfRow }] = await Promise.all([
    supabase.from('vouchers').select('*').order('created_at', { ascending: false }),
    supabase.from('storefront_settings').select('settings').eq('id', 'main').maybeSingle(),
  ]);

  if (error) throw new Error(error.message);

  const sfSettings = normalizeStorefrontSettings(sfRow?.settings ?? {});
  const targetingMap = sfSettings.voucher_targeting ?? {};

  const rows = (data ?? []) as Voucher[];
  return rows.map((v) => {
    const t = targetingMap[v.id];
    return {
      ...v,
      target_scope: t?.scope ?? 'all',
      applicable_categories: t?.category_ids ?? [],
      applicable_brands: t?.brand_ids ?? [],
      applicable_category_names: t?.category_names ?? [],
      applicable_brand_names: t?.brand_names ?? [],
      match_criteria: t?.match_criteria ?? 'all',
      is_new_customer_only: Boolean(t?.is_new_customer_only),
    };
  });
}

export async function saveAdminVoucherAction(formData: FormData) {
  const { user, adminName, role } = await requireModulePermission('vouchers');

  const id = (formData.get('id') as string | null)?.trim() || null;
  const rawCode = String(formData.get('code') ?? '');
  const code = normalizeVoucherCode(rawCode);

  if (!code || code.length < 2 || !/^[A-Z0-9_-]+$/.test(code)) {
    return { error: 'Kode voucher harus minimal 2 karakter dan hanya berisi huruf besar, angka, dan garis hubung (- atau _).' };
  }

  const description = String(formData.get('description') ?? '').trim() || null;
  const discountType = String(formData.get('discount_type') ?? '') as 'fixed_amount' | 'percentage';
  if (!['fixed_amount', 'percentage'].includes(discountType)) {
    return { error: 'Tipe diskon harus berupa "fixed_amount" (nominal) atau "percentage" (persentase).' };
  }

  const discountValue = Number(formData.get('discount_value'));
  if (isNaN(discountValue) || discountValue <= 0) {
    return { error: 'Nilai diskon harus lebih besar dari 0.' };
  }

  if (discountType === 'percentage' && discountValue > 100) {
    return { error: 'Diskon persentase tidak boleh lebih dari 100%.' };
  }

  const minPurchaseRaw = formData.get('min_purchase');
  const minPurchase = minPurchaseRaw ? Math.max(0, Number(minPurchaseRaw) || 0) : 0;

  const maxDiscountRaw = formData.get('max_discount');
  const maxDiscount = maxDiscountRaw && Number(maxDiscountRaw) > 0 ? Number(maxDiscountRaw) : null;

  const usageLimitRaw = formData.get('usage_limit');
  const usageLimit = usageLimitRaw && Number(usageLimitRaw) > 0 ? Number(usageLimitRaw) : null;

  const startDateRaw = (formData.get('start_date') as string | null)?.trim() || null;
  const endDateRaw = (formData.get('end_date') as string | null)?.trim() || null;

  const startDate = startDateRaw
    ? new Date(`${startDateRaw.slice(0, 10)}T00:00:00.000+07:00`).toISOString()
    : null;
  const endDate = endDateRaw
    ? new Date(`${endDateRaw.slice(0, 10)}T23:59:59.999+07:00`).toISOString()
    : null;

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return { error: 'Tanggal mulai tidak boleh lebih lambat dari tanggal berakhir.' };
  }

  const isActive = formData.get('is_active') === 'true' || formData.get('is_active') === 'on';
  const isNewCustomerOnly = formData.get('is_new_customer_only') === 'true' || formData.get('is_new_customer_only') === 'on';

  const adminClient = getSupabaseAdminClient();

  const payload = {
    code,
    description,
    discount_type: discountType,
    discount_value: discountValue,
    min_purchase: minPurchase,
    max_discount: discountType === 'percentage' ? maxDiscount : null,
    usage_limit: usageLimit,
    start_date: startDate,
    end_date: endDate,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  const targetScope = (formData.get('target_scope') as VoucherTargetScope) || 'all';
  const categoryIds = formData.getAll('category_ids').map((c) => String(c).trim()).filter(Boolean);
  const brandIds = formData.getAll('brand_ids').map((b) => String(b).trim()).filter(Boolean);
  const categoryNames = formData.getAll('category_names').map((c) => String(c).trim()).filter(Boolean);
  const brandNames = formData.getAll('brand_names').map((b) => String(b).trim()).filter(Boolean);
  const matchCriteria = (formData.get('match_criteria') as VoucherMatchCriteria) || 'all';

  const targetingPayload: VoucherTargeting = {
    scope: targetScope,
    category_ids: targetScope === 'all' ? [] : (targetScope === 'brand' ? [] : categoryIds),
    brand_ids: targetScope === 'all' ? [] : (targetScope === 'category' ? [] : brandIds),
    category_names: targetScope === 'all' ? [] : (targetScope === 'brand' ? [] : categoryNames),
    brand_names: targetScope === 'all' ? [] : (targetScope === 'category' ? [] : brandNames),
    match_criteria: matchCriteria,
    is_new_customer_only: isNewCustomerOnly,
  };

  const scopeDetail =
    (targetScope === 'category' && categoryNames.length
      ? ` [Kategori: ${categoryNames.join(', ')}]`
      : targetScope === 'brand' && brandNames.length
      ? ` [Merk: ${brandNames.join(', ')}]`
      : targetScope === 'category_and_brand'
      ? ` [Kategori: ${categoryNames.join(', ')} & Merk: ${brandNames.join(', ')}]`
      : ' [Semua Produk]') + (isNewCustomerOnly ? ' [Khusus Pengguna Baru]' : '');

  let targetVoucherId = id;

  if (id) {
    const { error } = await adminClient.from('vouchers').update(payload).eq('id', id);
    if (error) return { error: error.message };

    await recordAdminActivity({
      admin_id: user.id,
      admin_name: adminName,
      admin_role: role,
      action: 'update',
      entity_type: 'voucher',
      entity_name: code,
      details: `Memperbarui voucher "${code}" (${discountType === 'percentage' ? `${discountValue}%` : `Rp ${discountValue}`})${scopeDetail}`,
    });
  } else {
    // Check if code already exists
    const { data: existing } = await adminClient
      .from('vouchers')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return { error: `Kode voucher "${code}" sudah pernah dibuat. Silakan gunakan kode lain.` };
    }

    const { data: inserted, error } = await adminClient
      .from('vouchers')
      .insert({
        ...payload,
        usage_count: 0,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) return { error: error.message };
    targetVoucherId = inserted.id;

    await recordAdminActivity({
      admin_id: user.id,
      admin_name: adminName,
      admin_role: role,
      action: 'create',
      entity_type: 'voucher',
      entity_name: code,
      details: `Membuat voucher baru "${code}" (${discountType === 'percentage' ? `${discountValue}%` : `Rp ${discountValue}`})${scopeDetail}`,
    });
  }

  // Persist targeting in storefront_settings
  if (targetVoucherId) {
    const { data: sfData } = await adminClient
      .from('storefront_settings')
      .select('settings')
      .eq('id', 'main')
      .maybeSingle();

    const currentSettings = sfData?.settings && typeof sfData.settings === 'object' ? { ...sfData.settings } : {};
    const currentTargeting = { ...(currentSettings.voucher_targeting || {}) };
    currentTargeting[targetVoucherId] = targetingPayload;

    await adminClient
      .from('storefront_settings')
      .update({ settings: { ...currentSettings, voucher_targeting: currentTargeting } })
      .eq('id', 'main');
  }

  revalidatePath('/admin/vouchers');
  revalidatePath('/checkout');
  return { success: true };
}

export async function toggleAdminVoucherAction(id: string, is_active: boolean) {
  const { user, adminName, role } = await requireModulePermission('vouchers');
  const adminClient = getSupabaseAdminClient();

  const { data: voucher, error: fetchErr } = await adminClient
    .from('vouchers')
    .select('code')
    .eq('id', id)
    .single();

  if (fetchErr || !voucher) throw new Error('Voucher tidak ditemukan.');

  const { error } = await adminClient
    .from('vouchers')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'status_change',
    entity_type: 'voucher',
    entity_name: voucher.code,
    details: `${is_active ? 'Mengaktifkan' : 'Menonaktifkan'} voucher "${voucher.code}"`,
  });

  revalidatePath('/admin/vouchers');
  revalidatePath('/checkout');
  return { success: true };
}

export async function deleteAdminVoucherAction(id: string) {
  const { user, adminName, role } = await requireModulePermission('vouchers');
  const adminClient = getSupabaseAdminClient();

  const { data: voucher } = await adminClient
    .from('vouchers')
    .select('code')
    .eq('id', id)
    .single();

  const codeName = voucher?.code || id;

  const { error } = await adminClient.from('vouchers').delete().eq('id', id);
  if (error) throw new Error(error.message);

  // Clean up targeting from storefront_settings
  const { data: sfData } = await adminClient
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  if (sfData?.settings?.voucher_targeting?.[id]) {
    const currentSettings = { ...sfData.settings };
    const currentTargeting = { ...currentSettings.voucher_targeting };
    delete currentTargeting[id];
    await adminClient
      .from('storefront_settings')
      .update({ settings: { ...currentSettings, voucher_targeting: currentTargeting } })
      .eq('id', 'main');
  }

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role,
    action: 'delete',
    entity_type: 'voucher',
    entity_name: codeName,
    details: `Menghapus voucher "${codeName}"`,
  });

  revalidatePath('/admin/vouchers');
  revalidatePath('/checkout');
  return { success: true };
}
