import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { OrderInvoice, type InvoiceOrderData, type InvoiceOrderItem } from "@/components/invoice/OrderInvoice";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Faktur Pembelian Resmi",
  description: "Faktur dan invoice rincian transaksi pemesanan produk.",
};

const RICH_ORDER_ITEM_SELECT = `
  id,
  product_id,
  variant_id,
  product_name,
  price,
  quantity,
  variant_details,
  products (
    id,
    sku,
    name,
    description,
    product_images (url, is_primary),
    product_specifications (key, value, display_order)
  )
`;

interface RawOrderRecord {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount?: number | null;
  shipping_amount?: number | null;
  discount_amount?: number | null;
  grand_total?: number | null;
  courier: string;
  shipping_address?: InvoiceOrderData["shipping_address"];
  user_id: string | null;
  order_items?: unknown[];
  payments?: InvoiceOrderData["payments"];
}

export default async function OrderInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/orders/${encodeURIComponent(id)}/invoice`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const clientToUse = isAdmin ? getSupabaseAdminClient() : supabase;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const filterColumn = isUuid ? "id" : "order_number";

  // 1. Try rich query with nested product images and specifications
  let primaryQuery = clientToUse
    .from("orders")
    .select(`
      id,
      order_number,
      created_at,
      status,
      total_amount,
      shipping_amount,
      discount_amount,
      grand_total,
      courier,
      shipping_address,
      user_id,
      order_items (${RICH_ORDER_ITEM_SELECT}),
      payments (
        id,
        amount,
        payment_method,
        status
      )
    `)
    .eq(filterColumn, id);

  if (!isAdmin) {
    primaryQuery = primaryQuery.eq("user_id", user.id);
  }

  let order: RawOrderRecord | null = null;
  const { data: primaryData, error: primaryErr } = await primaryQuery.maybeSingle();
  if (!primaryErr && primaryData) {
    order = primaryData as unknown as RawOrderRecord;
  }
  let error = primaryErr;

  // 2. Resilient fallback query if deep product relations fail on older or modified records
  if (error || !order) {
    let fallbackQuery = clientToUse
      .from("orders")
      .select(`
        id,
        order_number,
        created_at,
        status,
        total_amount,
        shipping_amount,
        discount_amount,
        grand_total,
        courier,
        shipping_address,
        user_id,
        order_items (
          id,
          product_id,
          variant_id,
          product_name,
          price,
          quantity,
          variant_details
        ),
        payments (
          id,
          amount,
          payment_method,
          status
        )
      `)
      .eq(filterColumn, id);

    if (!isAdmin) {
      fallbackQuery = fallbackQuery.eq("user_id", user.id);
    }

    const fallbackResult = await fallbackQuery.maybeSingle();
    if (fallbackResult.data) {
      order = fallbackResult.data as unknown as RawOrderRecord;
      error = null;
    }
  }

  // 3. Fallback: if not UUID and first failed, or vice versa, try the other column
  if (!order) {
    const altColumn = isUuid ? "order_number" : "id";
    let altQuery = clientToUse
      .from("orders")
      .select(`
        id,
        order_number,
        created_at,
        status,
        total_amount,
        shipping_amount,
        discount_amount,
        grand_total,
        courier,
        shipping_address,
        user_id,
        order_items (
          id,
          product_id,
          variant_id,
          product_name,
          price,
          quantity,
          variant_details
        ),
        payments (
          id,
          amount,
          payment_method,
          status
        )
      `)
      .eq(altColumn, id);

    if (!isAdmin) {
      altQuery = altQuery.eq("user_id", user.id);
    }

    const altResult = await altQuery.maybeSingle();
    if (altResult.data) {
      order = altResult.data as unknown as RawOrderRecord;
      error = null;
    }
  }

  if (error || !order) {
    notFound();
  }

  // Double check authorization: customers can NEVER view someone else's order
  if (!isAdmin && order.user_id !== user.id) {
    notFound();
  }

  // Resolve the profile only by the order's own UUID. A missing user_id means
  // the account was deleted; never substitute the currently signed-in admin.
  const isCurrentUserOrder = order.user_id === user.id;
  let customerUser = isCurrentUserOrder
    ? {
        full_name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        email: user.email ?? null,
      }
    : { full_name: null, phone: null, email: null };

  if (order.user_id && !isCurrentUserOrder && isAdmin) {
    const [{ data: customerProfile }, { data: authResult }] = await Promise.all([
      clientToUse
        .from("users")
        .select("full_name, phone")
        .eq("id", order.user_id)
        .maybeSingle(),
      getSupabaseAdminClient().auth.admin.getUserById(order.user_id),
    ]);

    customerUser = {
      full_name: customerProfile?.full_name ?? null,
      phone: customerProfile?.phone ?? null,
      email: authResult.user?.email ?? null,
    };
  }

  // Fetch storefront settings
  const { data: sfRow } = await clientToUse
    .from("storefront_settings")
    .select("settings")
    .eq("id", "main")
    .maybeSingle();

  const storefront = normalizeStorefrontSettings(sfRow?.settings);

  const storefrontInfo = {
    storeName: storefront.store.name || storefront.pickup_info?.store_name || "Next Solution Store",
    storeAddress: storefront.store.address || "Jl. Kartini No. 9",
    storeCity: storefront.store.city || "Bandung",
    storePhone: storefront.store.phone,
    storeWhatsapp: storefront.store.whatsapp || storefront.store.phone,
    storeEmail: storefront.store.email,
    logoUrl: storefront.store.logo_url || "",
    logoDisplayMode: storefront.store.logo_display_mode || "both",
    bankAccounts: storefront.bank_transfer,
    headerSubtitle: storefront.invoice?.header_subtitle,
    termsNote: storefront.invoice?.terms_note,
    guaranteeNote: storefront.invoice?.guarantee_note,
    complaintWhatsapp: storefront.invoice?.complaint_whatsapp,
    complaintInstructions: storefront.invoice?.complaint_instructions,
    invoiceHeaderStyle: storefront.invoice?.header_style || "minimalist",
  };

  const invoiceOrder: InvoiceOrderData = {
    id: order.id,
    order_number: order.order_number,
    created_at: order.created_at,
    status: order.status,
    total_amount: Number(order.total_amount ?? 0),
    shipping_amount: Number(order.shipping_amount ?? 0),
    discount_amount: Number(order.discount_amount ?? 0),
    grand_total: Number(order.grand_total ?? 0),
    courier: order.courier,
    shipping_address: order.shipping_address,
    order_items: (order.order_items ?? []) as unknown as InvoiceOrderItem[],
    payments: (order.payments ?? []) as InvoiceOrderData["payments"],
    users: customerUser,
  };

  const backHref = isAdmin ? "/admin/orders" : "/profile";
  const backLabel = isAdmin ? "Kembali ke Panel Pesanan" : "Kembali ke Akun Saya";

  return (
    <OrderInvoice
      order={invoiceOrder}
      storefront={storefrontInfo}
      backHref={backHref}
      backLabel={backLabel}
      isAdmin={isAdmin}
    />
  );
}

