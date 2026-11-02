import { describe, it, expect } from "vitest";
import {
  DEFAULT_TERMS_CONTENT,
  DEFAULT_PRIVACY_CONTENT,
  normalizeLegalDocument,
  type LegalDocument,
} from "@/lib/legal-content";

describe("Legal Content Normalizer & Default Documents", () => {
  it("provides comprehensive default terms document with 8 clauses", () => {
    expect(DEFAULT_TERMS_CONTENT.title).toContain("Syarat & Ketentuan");
    expect(DEFAULT_TERMS_CONTENT.sections.length).toBe(8);
    expect(DEFAULT_TERMS_CONTENT.effective_domain).toBe("https://nextsolution.web.id");

    const sectionTitles = DEFAULT_TERMS_CONTENT.sections.map((s) => s.title);
    expect(sectionTitles.some((t) => t.includes("Pendaftaran Akun"))).toBe(true);
    expect(sectionTitles.some((t) => t.includes("Garansi Resmi"))).toBe(true);
    expect(sectionTitles.some((t) => t.includes("Voucher Diskon"))).toBe(true);

    const allContent = DEFAULT_TERMS_CONTENT.sections.map((s) => s.content).join(" ");
    expect(allContent).toContain("Pengembalian Stok Otomatis");
    expect(allContent).toContain("dikembalikan ke inventaris toko secara otomatis");
    expect(allContent).toContain("cacat pabrik");
  });

  it("provides comprehensive default privacy document with required clauses", () => {
    expect(DEFAULT_PRIVACY_CONTENT.title).toContain("Kebijakan Privasi");
    expect(DEFAULT_PRIVACY_CONTENT.sections.length).toBe(8);
    expect(DEFAULT_PRIVACY_CONTENT.effective_domain).toBe("https://nextsolution.web.id");

    const sectionTitles = DEFAULT_PRIVACY_CONTENT.sections.map((s) => s.title);
    expect(sectionTitles.some((t) => t.includes("Google Identity Services"))).toBe(true);
    expect(sectionTitles.some((t) => t.includes("Asisten Rekomendasi Belanja AI"))).toBe(true);
    expect(sectionTitles.some((t) => t.includes("First-Party"))).toBe(true);

    const allContent = DEFAULT_PRIVACY_CONTENT.sections.map((s) => s.content).join(" ");
    expect(allContent).toContain("Google Identity Services");
    expect(allContent).toContain("Supabase");
    expect(allContent).toContain("page_view");
  });

  it("returns fallback document when null or non-object is provided to normalizer", () => {
    const resFromNull = normalizeLegalDocument(null, DEFAULT_TERMS_CONTENT);
    expect(resFromNull.title).toBe(DEFAULT_TERMS_CONTENT.title);
    expect(resFromNull.sections.length).toBe(DEFAULT_TERMS_CONTENT.sections.length);

    const resFromEmpty = normalizeLegalDocument({}, DEFAULT_PRIVACY_CONTENT);
    expect(resFromEmpty.title).toBe(DEFAULT_PRIVACY_CONTENT.title);
    expect(resFromEmpty.sections.length).toBe(DEFAULT_PRIVACY_CONTENT.sections.length);
  });

  it("normalizes and preserves customized title, subtitle, and sections", () => {
    const custom: Partial<LegalDocument> = {
      title: "Ketentuan Resmi Toko Komputer",
      subtitle: "Ketentuan pembelian laptop dan PC rakitan resmi.",
      last_updated: "1 November 2026",
      effective_domain: "https://customdomain.com",
      sections: [
        {
          id: "custom-1",
          title: "1. Garansi 2 Tahun",
          content: "Semua laptop mendapatkan garansi resmi 2 tahun.",
        },
      ],
    };

    const normalized = normalizeLegalDocument(custom, DEFAULT_TERMS_CONTENT);
    expect(normalized.title).toBe("Ketentuan Resmi Toko Komputer");
    expect(normalized.subtitle).toBe("Ketentuan pembelian laptop dan PC rakitan resmi.");
    expect(normalized.last_updated).toBe("1 November 2026");
    expect(normalized.effective_domain).toBe("https://customdomain.com");
    expect(normalized.sections.length).toBe(1);
    expect(normalized.sections[0].title).toBe("1. Garansi 2 Tahun");
  });

  it("falls back to default sections if sections array is empty or invalid", () => {
    const customWithEmptySections: Partial<LegalDocument> = {
      title: "Custom Judul",
      sections: [],
    };

    const normalized = normalizeLegalDocument(customWithEmptySections, DEFAULT_TERMS_CONTENT);
    expect(normalized.title).toBe("Custom Judul");
    expect(normalized.sections.length).toBe(DEFAULT_TERMS_CONTENT.sections.length);
  });
});
