import { describe, it, expect } from "vitest";
import {
  normalizeStorefrontSettings,
  normalizeStoreFeatures,
  normalizeStoreStockLocation,
} from "@/lib/storefront-settings";

describe("Tax-Inclusive & Multi-Branch Stock Location Settings", () => {
  it("defaults tax_calculation_type to 'inclusive' in invoice settings", () => {
    const settings = normalizeStorefrontSettings({});
    expect(settings.invoice.tax_calculation_type).toBe("inclusive");
    expect(settings.invoice.tax_rate_percent).toBe(11);
  });

  it("preserves 'exclusive' tax_calculation_type when explicitly configured", () => {
    const settings = normalizeStorefrontSettings({
      invoice: {
        tax_invoice_enabled: true,
        tax_calculation_type: "exclusive",
        tax_rate_percent: 12,
      },
    });
    expect(settings.invoice.tax_calculation_type).toBe("exclusive");
    expect(settings.invoice.tax_rate_percent).toBe(12);
  });

  it("handles multi-branch stock locations in normalizeStoreFeatures", () => {
    const features = normalizeStoreFeatures({
      stock_location_display_enabled: true,
      stock_location_mode: "selected_branches",
      stock_locations: [
        {
          id: "branch-1",
          name: "Gerai Bandung (Jl. Kartini No. 09)",
          city: "Bandung",
          address: "Jl. Kartini No. 09",
          lead_time: "Siap Diambil di Toko / Dikirim Cepat",
          is_active: true,
        },
        {
          id: "branch-2",
          name: "Cabang Jakarta Pusat",
          city: "Jakarta",
          address: "Jl. Sudirman No. 12",
          lead_time: "Siap Diambil (1-2 Jam)",
          is_active: false,
        },
      ],
    });

    expect(features.stock_location_display_enabled).toBe(true);
    expect(features.stock_location_mode).toBe("selected_branches");
    expect(features.stock_locations).toHaveLength(2);
    expect(features.stock_locations?.[0].name).toBe("Gerai Bandung (Jl. Kartini No. 09)");
    expect(features.stock_locations?.[0].is_active).toBe(true);
    expect(features.stock_locations?.[1].name).toBe("Cabang Jakarta Pusat");
    expect(features.stock_locations?.[1].is_active).toBe(false);
  });

  it("normalizes single stock location object properly", () => {
    const loc = normalizeStoreStockLocation({
      id: "test-loc",
      name: "   Gudang Surabaya   ",
      city: "  Surabaya  ",
      lead_time: "  Siap Dikirim Cepat  ",
      is_active: true,
    });

    expect(loc.id).toBe("test-loc");
    expect(loc.name).toBe("Gudang Surabaya");
    expect(loc.city).toBe("Surabaya");
    expect(loc.lead_time).toBe("Siap Dikirim Cepat");
    expect(loc.is_active).toBe(true);
  });

  it("falls back gracefully when stock_locations is empty", () => {
    const features = normalizeStoreFeatures({
      stock_location_display_enabled: true,
      stock_location_name: "Gerai Utama Bandung",
      stock_location_lead_time: "Siap Langsung Diambil",
    });

    expect(features.stock_locations).toHaveLength(1);
    expect(features.stock_locations?.[0].name).toBe("Gerai Utama Bandung");
    expect(features.stock_locations?.[0].lead_time).toBe("Siap Langsung Diambil");
    expect(features.stock_locations?.[0].is_active).toBe(true);
  });

  it("correctly calculates DPP and PPN for Inclusive vs Exclusive tax", () => {
    const subtotal = 51499000;
    const discount = 0;
    const shipping = 0;
    const taxRate = 11;
    const taxableAmount = Math.max(0, subtotal - discount);

    // Inclusive calculation (Total does not increase)
    const inclusiveDpp = Math.round(taxableAmount / (1 + taxRate / 100));
    const inclusivePpn = taxableAmount - inclusiveDpp;
    const inclusiveGrandTotal = taxableAmount + shipping;

    expect(inclusiveDpp).toBe(46395495);
    expect(inclusivePpn).toBe(5103505);
    expect(inclusiveDpp + inclusivePpn).toBe(subtotal);
    expect(inclusiveGrandTotal).toBe(51499000);

    // Exclusive calculation (PPN added on top)
    const exclusivePpn = Math.round(taxableAmount * (taxRate / 100));
    const exclusiveGrandTotal = taxableAmount + shipping + exclusivePpn;

    expect(exclusivePpn).toBe(5664890);
    expect(exclusiveGrandTotal).toBe(57163890);
  });
});
