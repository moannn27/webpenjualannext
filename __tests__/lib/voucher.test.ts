import { describe, expect, it } from 'vitest';
import { calculateVoucherDiscount, normalizeVoucherCode, formatVoucherLabel } from '@/lib/voucher';
import { type Voucher } from '@/types/voucher';

describe('Voucher logic & anti-abuse tests', () => {
  const baseVoucher: Voucher = {
    id: 'test-voucher-1',
    code: 'DISKON20',
    description: 'Diskon 20% max 300rb min 100rb',
    discount_type: 'percentage',
    discount_value: 20,
    min_purchase: 100000,
    max_discount: 300000,
    start_date: null,
    end_date: null,
    is_active: true,
    usage_limit: 10,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('normalizes voucher code properly', () => {
    expect(normalizeVoucherCode('  diskon20 ')).toBe('DISKON20');
    expect(normalizeVoucherCode('hemat_100k')).toBe('HEMAT_100K');
  });

  it('rejects inactive vouchers', () => {
    const result = calculateVoucherDiscount({ ...baseVoucher, is_active: false }, 200000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('tidak aktif');
  });

  it('rejects if current subtotal is below min_purchase requirement', () => {
    const result = calculateVoucherDiscount(baseVoucher, 80000); // 80k < 100k
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Minimal belanja');
  });

  it('calculates percentage discount accurately without exceeding max_discount', () => {
    // 20% of 500,000 = 100,000 (< 300,000 cap)
    const result1 = calculateVoucherDiscount(baseVoucher, 500000);
    expect(result1.isValid).toBe(true);
    expect(result1.discountAmount).toBe(100000);
    expect(result1.finalSubtotal).toBe(400000);

    // 20% of 2,000,000 = 400,000 (> 300,000 cap -> capped at 300,000)
    const result2 = calculateVoucherDiscount(baseVoucher, 2000000);
    expect(result2.isValid).toBe(true);
    expect(result2.discountAmount).toBe(300000);
    expect(result2.finalSubtotal).toBe(1700000);
  });

  it('calculates fixed_amount discount accurately', () => {
    const fixedVoucher: Voucher = {
      ...baseVoucher,
      discount_type: 'fixed_amount',
      discount_value: 50000,
      min_purchase: 100000,
      max_discount: null,
    };

    const result = calculateVoucherDiscount(fixedVoucher, 250000);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(50000);
    expect(result.finalSubtotal).toBe(200000);
  });

  it('does not allow discount to exceed subtotal', () => {
    const fixedVoucher: Voucher = {
      ...baseVoucher,
      discount_type: 'fixed_amount',
      discount_value: 500000,
      min_purchase: 0,
      max_discount: null,
    };

    const result = calculateVoucherDiscount(fixedVoucher, 300000);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(300000);
    expect(result.finalSubtotal).toBe(0);
  });

  it('rejects if usage_limit has been reached', () => {
    const exhaustedVoucher: Voucher = {
      ...baseVoucher,
      usage_limit: 5,
      usage_count: 5,
    };

    const result = calculateVoucherDiscount(exhaustedVoucher, 200000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Kuota pemakaian');
  });

  it('rejects expired vouchers based on end_date', () => {
    const expiredVoucher: Voucher = {
      ...baseVoucher,
      end_date: '2026-01-01T00:00:00Z',
    };

    const now = new Date('2026-10-10T00:00:00Z');
    const result = calculateVoucherDiscount(expiredVoucher, 200000, now);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('kadaluarsa');
  });

  it('rejects vouchers whose start_date has not arrived yet', () => {
    const futureVoucher: Voucher = {
      ...baseVoucher,
      start_date: '2026-12-01T00:00:00Z',
    };

    const now = new Date('2026-10-10T00:00:00Z');
    const result = calculateVoucherDiscount(futureVoucher, 200000, now);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('baru dapat digunakan');
  });

  it('allows voucher to be used on the start date in Asia/Jakarta timezone even if UTC midnight', () => {
    const todayVoucher: Voucher = {
      ...baseVoucher,
      start_date: '2026-10-11T00:00:00.000Z',
      end_date: '2026-10-12T00:00:00.000Z',
    };

    // 00:50 AM on October 11, 2026 in WIB (which is 17:50 on Oct 10 in UTC)
    const nowEarlyMorningWib = new Date('2026-10-11T00:50:36+07:00');
    const result = calculateVoucherDiscount(todayVoucher, 200000, nowEarlyMorningWib);
    expect(result.isValid).toBe(true);
    expect(result.discountAmount).toBe(40000); // 20% of 200,000
  });

  it('keeps voucher valid until the end of end_date day in Asia/Jakarta timezone', () => {
    const activeVoucher: Voucher = {
      ...baseVoucher,
      start_date: '2026-10-11T00:00:00.000Z',
      end_date: '2026-10-12T00:00:00.000Z',
    };

    // 23:45 PM on October 12 in WIB (should still be valid)
    const nowLateNightWib = new Date('2026-10-12T23:45:00+07:00');
    const resultValid = calculateVoucherDiscount(activeVoucher, 200000, nowLateNightWib);
    expect(resultValid.isValid).toBe(true);

    // 00:05 AM on October 13 in WIB (should now be expired)
    const nowNextDayWib = new Date('2026-10-13T00:05:00+07:00');
    const resultExpired = calculateVoucherDiscount(activeVoucher, 200000, nowNextDayWib);
    expect(resultExpired.isValid).toBe(false);
    expect(resultExpired.error).toContain('kadaluarsa');
  });

  it('formats voucher label cleanly', () => {
    expect(formatVoucherLabel(baseVoucher)).toContain('Diskon 20% (Maks.');
    expect(formatVoucherLabel(baseVoucher)).toContain('Min. Belanja');
  });

  describe('Category & Brand Targeting Rules', () => {
    const laptopCatId = 'cat-laptop';
    const smartphoneCatId = 'cat-phone';
    const asusBrandId = 'brand-asus';
    const samsungBrandId = 'brand-samsung';

    const cartItems = [
      {
        product_id: 'prod-1',
        price: 15000000,
        quantity: 1,
        category_id: laptopCatId,
        category_name: 'Laptops',
        brand_id: asusBrandId,
        brand_name: 'Asus',
      },
      {
        product_id: 'prod-2',
        price: 10000000,
        quantity: 1,
        category_id: smartphoneCatId,
        category_name: 'Smartphones',
        brand_id: samsungBrandId,
        brand_name: 'Samsung',
      },
    ];
    // Total cart = 25,000,000 (Laptop Asus = 15,000,000; Phone Samsung = 10,000,000)

    it('applies category-specific voucher only to eligible products', () => {
      const laptopVoucher: Voucher = {
        ...baseVoucher,
        code: 'LAPTOP10',
        target_scope: 'category',
        applicable_categories: [laptopCatId],
        applicable_category_names: ['Laptops'],
        discount_type: 'percentage',
        discount_value: 10, // 10%
        max_discount: 2000000,
        min_purchase: 5000000,
      };

      // 10% on Laptop (15jt) = 1.5jt. Total cart: 25jt -> final 23.5jt
      const result = calculateVoucherDiscount(laptopVoucher, 25000000, { items: cartItems });
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(1500000);
      expect(result.finalSubtotal).toBe(23500000);
      expect(result.eligibleSubtotal).toBe(15000000);
      expect(result.eligibleItemsCount).toBe(1);
    });

    it('rejects category voucher if no matching items exist in cart', () => {
      const tabletVoucher: Voucher = {
        ...baseVoucher,
        code: 'TABLET50',
        target_scope: 'category',
        applicable_categories: ['cat-tablet'],
        applicable_category_names: ['Tablets'],
      };

      const result = calculateVoucherDiscount(tabletVoucher, 25000000, { items: cartItems });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Tablets');
      expect(result.error).toContain('tidak memiliki produk yang memenuhi kriteria');
    });

    it('rejects category voucher if eligible subtotal is below min_purchase', () => {
      const highMinVoucher: Voucher = {
        ...baseVoucher,
        code: 'LAPTOPVIP',
        target_scope: 'category',
        applicable_categories: [laptopCatId],
        applicable_category_names: ['Laptops'],
        min_purchase: 20000000, // 20jt required on laptops, but cart only has 15jt
      };

      const result = calculateVoucherDiscount(highMinVoucher, 25000000, { items: cartItems });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minimal belanja untuk produk yang memenuhi syarat');
    });

    it('applies brand-specific voucher accurately', () => {
      const samsungVoucher: Voucher = {
        ...baseVoucher,
        code: 'SAMSUNGFIXED',
        target_scope: 'brand',
        applicable_brands: [samsungBrandId],
        applicable_brand_names: ['Samsung'],
        discount_type: 'fixed_amount',
        discount_value: 500000,
        min_purchase: 5000000,
      };

      const result = calculateVoucherDiscount(samsungVoucher, 25000000, { items: cartItems });
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(500000);
      expect(result.finalSubtotal).toBe(24500000);
      expect(result.eligibleSubtotal).toBe(10000000);
    });

    it('enforces combination targeting (category AND brand)', () => {
      // Voucher khusus Laptop Asus
      const asusLaptopVoucher: Voucher = {
        ...baseVoucher,
        code: 'ASUSLAPTOP',
        target_scope: 'category_and_brand',
        applicable_categories: [laptopCatId],
        applicable_brands: [asusBrandId],
        applicable_category_names: ['Laptops'],
        applicable_brand_names: ['Asus'],
        match_criteria: 'all',
        discount_type: 'percentage',
        discount_value: 10,
        max_discount: null,
      };

      const result = calculateVoucherDiscount(asusLaptopVoucher, 25000000, { items: cartItems });
      expect(result.isValid).toBe(true);
      expect(result.eligibleSubtotal).toBe(15000000);
      expect(result.discountAmount).toBe(1500000);

      // Voucher khusus Smartphone Asus (no item matches both)
      const asusPhoneVoucher: Voucher = {
        ...baseVoucher,
        code: 'ASUSPHONE',
        target_scope: 'category_and_brand',
        applicable_categories: [smartphoneCatId],
        applicable_brands: [asusBrandId],
        applicable_category_names: ['Smartphones'],
        applicable_brand_names: ['Asus'],
        match_criteria: 'all',
      };

      const failResult = calculateVoucherDiscount(asusPhoneVoucher, 25000000, { items: cartItems });
      expect(failResult.isValid).toBe(false);
      expect(failResult.error).toContain('Smartphones');
      expect(failResult.error).toContain('Asus');
    });

    it('supports combination targeting with OR criteria (category OR brand)', () => {
      // Voucher untuk kategori Smartphone ATAU merk Asus
      // Cart item 1: Laptop Asus (matches brand Asus) -> 15jt
      // Cart item 2: Smartphone Samsung (matches category Smartphone) -> 10jt
      // Both match! Total eligible = 25jt
      const unionVoucher: Voucher = {
        ...baseVoucher,
        code: 'OR_VOUCHER',
        target_scope: 'category_and_brand',
        applicable_categories: [smartphoneCatId],
        applicable_brands: [asusBrandId],
        applicable_category_names: ['Smartphones'],
        applicable_brand_names: ['Asus'],
        match_criteria: 'any',
        discount_type: 'percentage',
        discount_value: 10,
        max_discount: null,
      };

      const result = calculateVoucherDiscount(unionVoucher, 25000000, { items: cartItems });
      expect(result.isValid).toBe(true);
      expect(result.eligibleSubtotal).toBe(25000000);
      expect(result.discountAmount).toBe(2500000);
    });
  });
});

