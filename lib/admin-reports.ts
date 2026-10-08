export type EcommerceReport = {
  days: number;
  summary: {
    total_orders: number;
    pending_orders: number;
    active_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    completed_sales: number;
    average_order_value: number;
    buying_customers: number;
    repeat_customers: number;
    new_customers: number;
    pending_payment_orders: number;
    successful_payment_orders: number;
    failed_payment_orders: number;
    refunded_orders: number;
  };
  daily: { day: string; orders: number; revenue: number }[];
  best_products: { id: string; name: string; units_sold: number; item_revenue: number; order_count: number }[];
  least_products: { id: string; name: string; units_sold: number; item_revenue: number; order_count: number }[];
  top_customers: { id: string; name: string; phone: string | null; completed_orders: number; spend: number; last_order_day: string | null }[];
};
