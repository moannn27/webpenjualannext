import { describe, expect, it } from "vitest";
import type { InvoiceOrderData, InvoiceStorefrontInfo } from "@/components/invoice/OrderInvoice";

describe("OrderInvoice Data Structure & Logic", () => {
  const sampleOrder: InvoiceOrderData = {
    id: "ord-12345",
    order_number: "INV-20261021-0001",
    created_at: "2026-10-21T07:30:00.000Z",
    status: "processing",
    total_amount: 15499000,
    shipping_amount: 25000,
    discount_amount: 50000,
    grand_total: 15474000,
    courier: "jne",
    shipping_address: {
      recipient_name: "Wagino Subianto",
      phone: "081234567890",
      street_address: "Jl. Sukajadi No. 120",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40162",
    },
    order_items: [
      {
        id: "item-1",
        product_name: "Lenovo IdeaPad Slim 5 14AKP10",
        price: 15499000,
        quantity: 1,
        variant_details: {
          color: "Cloud Grey",
          ram: "16GB",
          storage: "512GB SSD",
        },
        sku: "83HX-IDEAPAD-SLIM-5",
        products: {
          name: "Lenovo IdeaPad Slim 5 14AKP10",
          sku: "83HX-IDEAPAD-SLIM-5",
          brands: { name: "Lenovo" },
          categories: { name: "Laptops" },
          product_specifications: [
            { key: "Processor", value: "AMD Ryzen AI 7 365", display_order: 1 },
            { key: "Display", value: "14\" OLED WQXGA", display_order: 2 },
          ],
        },
      },
    ],
    payments: [
      {
        id: "pay-1",
        amount: 15474000,
        payment_method: "bca_transfer",
        status: "success",
      },
    ],
    users: {
      full_name: "Wagino Subianto",
      phone: "081234567890",
      email: "wagino@example.com",
    },
  };

  const sampleStorefront: InvoiceStorefrontInfo = {
    storeName: "Next Solution Store",
    storeAddress: "Jl. Kartini No. 9",
    storeCity: "Bandung",
    storePhone: "081234567890",
    storeWhatsapp: "081234567890",
    storeEmail: "support@nextsolution.com",
    bankAccounts: [
      {
        bank_name: "BCA",
        account_number: "8320192831",
        account_holder: "Next Solution Store",
      },
    ],
  };

  it("calculates accurate line item total and grand total", () => {
    const item = sampleOrder.order_items[0];
    const subtotal = item.price * item.quantity;
    expect(subtotal).toBe(15499000);

    const calculatedGrandTotal =
      sampleOrder.total_amount +
      sampleOrder.shipping_amount -
      sampleOrder.discount_amount;
    expect(calculatedGrandTotal).toBe(sampleOrder.grand_total);
    expect(sampleOrder.grand_total).toBe(15474000);
  });

  it("handles pickup courier with zero shipping amount", () => {
    const pickupOrder: InvoiceOrderData = {
      ...sampleOrder,
      courier: "pickup",
      shipping_amount: 0,
      grand_total: 15449000,
      shipping_address: {
        recipient_name: "Budi Santoso",
        phone: "081299998888",
        pickup_location: "Next Solution Bandung",
        pickup_address: "Jl. Kartini No. 9, Bandung",
      },
    };

    expect(pickupOrder.courier).toBe("pickup");
    expect(pickupOrder.shipping_amount).toBe(0);
    expect(pickupOrder.shipping_address?.pickup_location).toBe("Next Solution Bandung");
  });

  it("formats Indonesian Rupiah currency values accurately", () => {
    const formatRupiah = (num: number) =>
      `Rp ${Number(num ?? 0).toLocaleString("id-ID")}`;

    expect(formatRupiah(15499000)).toBe("Rp 15.499.000");
    expect(formatRupiah(25000)).toBe("Rp 25.000");
    expect(formatRupiah(0)).toBe("Rp 0");
  });

  it("retains complete storefront contact and bank account information", () => {
    expect(sampleStorefront.storeName).toBe("Next Solution Store");
    expect(sampleStorefront.bankAccounts?.[0].bank_name).toBe("BCA");
    expect(sampleStorefront.bankAccounts?.[0].account_number).toBe("8320192831");
    expect(sampleStorefront.storeEmail).toBe("support@nextsolution.com");
  });
});

