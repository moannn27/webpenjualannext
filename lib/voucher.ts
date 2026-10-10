import {
  type Voucher,
  type VoucherValidationResult,
  type VoucherItemInput,
} from '@/types/voucher';

export function normalizeVoucherCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

export function formatVoucherCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseVoucherDate(
  dateInput: string | Date | null | undefined,
  isEnd = false
): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  const raw = String(dateInput).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const datePart = match[1];
    const isMidnight = !raw.includes('T') || raw.includes('T00:00:00');
    if (isMidnight) {
      return isEnd
        ? new Date(`${datePart}T23:59:59.999+07:00`)
        : new Date(`${datePart}T00:00:00.000+07:00`);
    }
  }

  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function isItemEligibleForVoucher(
  item: VoucherItemInput,
  voucher: Voucher
): boolean {
  const scope =
    voucher.target_scope ||
    (voucher.applicable_categories &&
    voucher.applicable_categories.length > 0 &&
    voucher.applicable_brands &&
    voucher.applicable_brands.length > 0
      ? 'category_and_brand'
      : voucher.applicable_categories && voucher.applicable_categories.length > 0
      ? 'category'
      : voucher.applicable_brands && voucher.applicable_brands.length > 0
      ? 'brand'
      : 'all');

  if (scope === 'all') return true;

  const targetCategories = (voucher.applicable_categories || []).map((c) =>
    String(c).trim().toLowerCase()
  );
  const targetBrands = (voucher.applicable_brands || []).map((b) =>
    String(b).trim().toLowerCase()
  );

  const itemCatId = item.category_id ? String(item.category_id).trim().toLowerCase() : '';
  const itemCatName = item.category_name ? String(item.category_name).trim().toLowerCase() : '';
  const itemBrandId = item.brand_id ? String(item.brand_id).trim().toLowerCase() : '';
  const itemBrandName = item.brand_name ? String(item.brand_name).trim().toLowerCase() : '';

  const matchesCategory =
    targetCategories.length > 0 &&
    ((Boolean(itemCatId) && targetCategories.includes(itemCatId)) ||
      (Boolean(itemCatName) && targetCategories.includes(itemCatName)));

  const matchesBrand =
    targetBrands.length > 0 &&
    ((Boolean(itemBrandId) && targetBrands.includes(itemBrandId)) ||
      (Boolean(itemBrandName) && targetBrands.includes(itemBrandName)));

  if (scope === 'category') {
    return matchesCategory;
  }

  if (scope === 'brand') {
    return matchesBrand;
  }

  if (scope === 'category_and_brand') {
    if (voucher.match_criteria === 'any') {
      return matchesCategory || matchesBrand;
    }
    // Default: 'all' (intersection - both category AND brand must match)
    return matchesCategory && matchesBrand;
  }

  return true;
}

export function calculateVoucherDiscount(
  voucher: Voucher,
  subtotal: number,
  optionsOrNow: Date | { items?: VoucherItemInput[]; now?: Date } = new Date()
): VoucherValidationResult {
  const now = optionsOrNow instanceof Date ? optionsOrNow : optionsOrNow.now ?? new Date();
  const items = optionsOrNow instanceof Date ? undefined : optionsOrNow.items;

  if (!voucher || !voucher.is_active) {
    return {
      isValid: false,
      error: 'Voucher sedang tidak aktif atau tidak berlaku.',
      discountAmount: 0,
      finalSubtotal: subtotal,
    };
  }

  if (voucher.start_date) {
    const startDate = parseVoucherDate(voucher.start_date, false);
    if (startDate && now < startDate) {
      const formatted = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeZone: 'Asia/Jakarta',
      }).format(startDate);
      return {
        isValid: false,
        error: `Voucher ini baru dapat digunakan mulai ${formatted}.`,
        discountAmount: 0,
        finalSubtotal: subtotal,
      };
    }
  }

  if (voucher.end_date) {
    const endDate = parseVoucherDate(voucher.end_date, true);
    if (endDate && now > endDate) {
      return {
        isValid: false,
        error: 'Voucher ini sudah melewati batas masa berlaku (kadaluarsa).',
        discountAmount: 0,
        finalSubtotal: subtotal,
      };
    }
  }

  if (voucher.usage_limit !== null && voucher.usage_limit !== undefined) {
    if (voucher.usage_count >= voucher.usage_limit) {
      return {
        isValid: false,
        error: 'Kuota pemakaian voucher ini sudah habis.',
        discountAmount: 0,
        finalSubtotal: subtotal,
      };
    }
  }

  // Advanced Item-Level Targeting Logic
  const scope =
    voucher.target_scope ||
    (voucher.applicable_categories &&
    voucher.applicable_categories.length > 0 &&
    voucher.applicable_brands &&
    voucher.applicable_brands.length > 0
      ? 'category_and_brand'
      : voucher.applicable_categories && voucher.applicable_categories.length > 0
      ? 'category'
      : voucher.applicable_brands && voucher.applicable_brands.length > 0
      ? 'brand'
      : 'all');

  if (items && items.length > 0 && scope !== 'all') {
    const eligibleItems = items.filter((item) => isItemEligibleForVoucher(item, voucher));
    const eligibleSubtotal = eligibleItems.reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 1),
      0
    );

    if (eligibleSubtotal <= 0) {
      let targetDesc = 'produk tertentu';
      if (scope === 'category') {
        const catNames = voucher.applicable_category_names?.join(', ') || 'kategori yang ditentukan';
        targetDesc = `kategori "${catNames}"`;
      } else if (scope === 'brand') {
        const brandNames = voucher.applicable_brand_names?.join(', ') || 'merk yang ditentukan';
        targetDesc = `merk "${brandNames}"`;
      } else if (scope === 'category_and_brand') {
        const catNames = voucher.applicable_category_names?.join(', ') || 'kategori tertentu';
        const brandNames = voucher.applicable_brand_names?.join(', ') || 'merk tertentu';
        const conn = voucher.match_criteria === 'any' ? 'atau' : 'dari';
        targetDesc = `kategori "${catNames}" ${conn} merk "${brandNames}"`;
      }

      return {
        isValid: false,
        error: `Voucher ini khusus untuk produk ${targetDesc}. Keranjang belanja Anda tidak memiliki produk yang memenuhi kriteria tersebut.`,
        discountAmount: 0,
        finalSubtotal: subtotal,
        eligibleSubtotal: 0,
        eligibleItemsCount: 0,
      };
    }

    const minPurchase = Number(voucher.min_purchase || 0);
    if (minPurchase > 0 && eligibleSubtotal < minPurchase) {
      return {
        isValid: false,
        error: `Minimal belanja untuk produk yang memenuhi syarat voucher ini adalah ${formatVoucherCurrency(
          minPurchase
        )} (total produk yang sesuai di keranjang Anda: ${formatVoucherCurrency(eligibleSubtotal)}).`,
        discountAmount: 0,
        finalSubtotal: subtotal,
        eligibleSubtotal,
        eligibleItemsCount: eligibleItems.length,
      };
    }

    let discount = 0;
    const discountVal = Number(voucher.discount_value || 0);

    if (voucher.discount_type === 'fixed_amount') {
      discount = Math.min(discountVal, eligibleSubtotal);
    } else if (voucher.discount_type === 'percentage') {
      const rawDiscount = Math.round((eligibleSubtotal * discountVal) / 100);
      const maxDiscount = voucher.max_discount ? Number(voucher.max_discount) : null;

      if (maxDiscount && maxDiscount > 0) {
        discount = Math.min(rawDiscount, maxDiscount);
      } else {
        discount = rawDiscount;
      }
      discount = Math.min(discount, eligibleSubtotal);
    }

    discount = Math.max(0, Math.round(discount));
    const finalSubtotal = Math.max(0, subtotal - discount);

    return {
      isValid: true,
      voucher,
      discountAmount: discount,
      finalSubtotal,
      eligibleSubtotal,
      eligibleItemsCount: eligibleItems.length,
    };
  }

  // Fallback: standard subtotal evaluation (scope === 'all' or no items passed)
  const minPurchase = Number(voucher.min_purchase || 0);
  if (minPurchase > 0 && subtotal < minPurchase) {
    return {
      isValid: false,
      error: `Minimal belanja untuk voucher ini adalah ${formatVoucherCurrency(
        minPurchase
      )} (subtotal belanja Anda saat ini ${formatVoucherCurrency(subtotal)}).`,
      discountAmount: 0,
      finalSubtotal: subtotal,
    };
  }

  let discount = 0;
  const discountVal = Number(voucher.discount_value || 0);

  if (voucher.discount_type === 'fixed_amount') {
    discount = Math.min(discountVal, subtotal);
  } else if (voucher.discount_type === 'percentage') {
    const rawDiscount = Math.round((subtotal * discountVal) / 100);
    const maxDiscount = voucher.max_discount ? Number(voucher.max_discount) : null;

    if (maxDiscount && maxDiscount > 0) {
      discount = Math.min(rawDiscount, maxDiscount);
    } else {
      discount = rawDiscount;
    }
    discount = Math.min(discount, subtotal);
  }

  discount = Math.max(0, Math.round(discount));
  const finalSubtotal = Math.max(0, subtotal - discount);

  return {
    isValid: true,
    voucher,
    discountAmount: discount,
    finalSubtotal,
    eligibleSubtotal: subtotal,
  };
}

export function formatVoucherLabel(
  voucher: Pick<
    Voucher,
    | 'discount_type'
    | 'discount_value'
    | 'max_discount'
    | 'min_purchase'
    | 'target_scope'
    | 'applicable_category_names'
    | 'applicable_brand_names'
  >
): string {
  const parts: string[] = [];
  if (voucher.discount_type === 'percentage') {
    let str = `Diskon ${voucher.discount_value}%`;
    if (voucher.max_discount && Number(voucher.max_discount) > 0) {
      str += ` (Maks. ${formatVoucherCurrency(Number(voucher.max_discount))})`;
    }
    parts.push(str);
  } else {
    parts.push(`Potongan ${formatVoucherCurrency(Number(voucher.discount_value))}`);
  }

  if (voucher.min_purchase && Number(voucher.min_purchase) > 0) {
    parts.push(`Min. Belanja ${formatVoucherCurrency(Number(voucher.min_purchase))}`);
  }

  if (voucher.target_scope === 'category' && voucher.applicable_category_names?.length) {
    parts.push(`Khusus Kategori: ${voucher.applicable_category_names.join(', ')}`);
  } else if (voucher.target_scope === 'brand' && voucher.applicable_brand_names?.length) {
    parts.push(`Khusus Merk: ${voucher.applicable_brand_names.join(', ')}`);
  } else if (voucher.target_scope === 'category_and_brand') {
    const c = voucher.applicable_category_names?.join(', ');
    const b = voucher.applicable_brand_names?.join(', ');
    if (c && b) {
      parts.push(`Khusus: ${c} (${b})`);
    }
  }

  return parts.join(' • ');
}

