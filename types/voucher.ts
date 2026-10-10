export type VoucherDiscountType = 'fixed_amount' | 'percentage';
export type VoucherTargetScope = 'all' | 'category' | 'brand' | 'category_and_brand';
export type VoucherMatchCriteria = 'all' | 'any';

export interface VoucherTargeting {
  scope: VoucherTargetScope;
  category_ids: string[];
  brand_ids: string[];
  category_names?: string[];
  brand_names?: string[];
  match_criteria?: VoucherMatchCriteria;
  is_new_customer_only?: boolean;
}

export interface Voucher {
  id: string;
  code: string;
  description: string | null;
  discount_type: VoucherDiscountType;
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
  // Advanced targeting & new customer rule:
  target_scope?: VoucherTargetScope;
  applicable_categories?: string[];
  applicable_brands?: string[];
  applicable_category_names?: string[];
  applicable_brand_names?: string[];
  match_criteria?: VoucherMatchCriteria;
  is_new_customer_only?: boolean;
}

export interface VoucherItemInput {
  product_id?: string;
  price: number;
  quantity: number;
  category_id?: string | null;
  brand_id?: string | null;
  category_name?: string | null;
  brand_name?: string | null;
}

export interface VoucherValidationResult {
  isValid: boolean;
  error?: string;
  voucher?: Voucher;
  discountAmount: number;
  finalSubtotal: number;
  eligibleSubtotal?: number;
  eligibleItemsCount?: number;
}
