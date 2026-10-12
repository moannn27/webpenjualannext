import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeStorefrontSettings } from "@/lib/storefront-settings";
import { OrderInvoice, type InvoiceOrderData } from "@/components/invoice/OrderInvoice";
import { notFound, redirect } from "next/navigation";

export const metadata = {
  title: "Faktur Pembelian Resmi",
  description: "Faktur dan invoice rincian transaksi pemesanan produk.",
};

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
    redirect(`/login?redirect=/orders/${id}/invoice`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // If admin, fetch order using admin client to view any customer invoice.
  // Otherwise fetch using standard client ensuring user_id matches.
  const clientToUse = isAdmin ? getSupabaseAdminClient() : supabase;
  const orderQuery = clientToUse
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
        product_name,
        price,
        quantity,
        variant_details,
        products (
          id,
          sku,
          name,
          description,
          brands (name),
          categories (name),
          product_images (url, is_primary),
          product_specifications (key, value)
        )
      ),
      payments (
        id,
        amount,
        payment_method,
        status
      ),
      users (
        full_name,
        phone
      )
    `)
    .eq("id", id);

  if (!isAdmin) {
    orderQuery.eq("user_id", user.id);
  }

  const [{ data: order, error }, { data: sfRow }] = await Promise.all([
    orderQuery.maybeSingle(),
    supabase.from("storefront_settings").select("settings").eq("id", "main").maybeSingle(),
  ]);

  if (error || !order) {
    notFound();
  }

  const storefront = normalizeStorefrontSettings(sfRow?.settings);

  const storefrontInfo = {
    storeName: storefront.pickup_info?.store_name || "Next Solution Store",
    storeAddress: storefront.store.address || "Jl. Kartini No. 9",
    storeCity: storefront.store.city || "Bandung",
    storePhone: storefront.store.phone,
    storeWhatsapp: storefront.store.whatsapp,
    storeEmail: storefront.store.email,
    bankAccounts: storefront.bank_transfer,
  };

  const backHref = isAdmin ? "/admin/orders" : "/profile";
  const backLabel = isAdmin ? "Kembali ke Panel Pesanan" : "Kembali ke Akun Saya";

  return (
    <OrderInvoice
      order={order as unknown as InvoiceOrderData}
      storefront={storefrontInfo}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
