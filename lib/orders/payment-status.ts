export type OrderPaymentState = "paid" | "pending" | "failed" | "refunded";

type PaymentLike = { status?: string | null } | null | undefined;

/** Payment state comes from payment records; fulfillment progress cannot prove payment. */
export function getOrderPaymentState(payments: PaymentLike[] = []): OrderPaymentState {
  const statuses = payments.map((payment) => payment?.status?.toLowerCase());

  if (statuses.includes("success")) return "paid";
  if (statuses.includes("refunded")) return "refunded";
  if (statuses.includes("failed") || statuses.includes("expired")) return "failed";
  return "pending";
}
