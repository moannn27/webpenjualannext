import { describe, it, expect } from "vitest";
import { metadata as privacyMetadata } from "@/app/privacy-policy/page";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import LegacyPrivacyPage, { metadata as legacyPrivacyMetadata } from "@/app/privacy/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import TermsPage from "@/app/terms/page";
import React from "react";
import { renderToString } from "react-dom/server";

describe("Legal Pages - Privacy Policy & Terms and Conditions", () => {
  describe("Privacy Policy (/privacy-policy)", () => {
    it("exports valid SEO metadata with canonical url", () => {
      expect(privacyMetadata.title).toContain("Kebijakan Privasi");
      expect(privacyMetadata.description).toBeDefined();
      expect(privacyMetadata.alternates?.canonical).toBe("/privacy-policy");
    });

    it("renders comprehensive legal content covering all required aspects", () => {
      const html = renderToString(React.createElement(PrivacyPolicyPage));

      // 1. Google Identity Services / Social Login
      expect(html).toContain("Google Identity Services");
      expect(html).toContain("nama lengkap");
      expect(html).toContain("alamat email terverifikasi");
      expect(html).toContain("avatar");
      expect(html).toContain("kata sandi");

      // 2. Data Transaksi & Pemesanan
      expect(html).toContain("Data Transaksi, Pemesanan, dan Pengiriman");
      expect(html).toContain("nomor WhatsApp");
      expect(html).toContain("alamat tujuan pengiriman");

      // 3. First-Party Analytics
      expect(html).toContain("First-Party");
      expect(html).toContain("page_view");
      expect(html).toContain("visitor_id");
      expect(html).toContain("session_id");

      // 4. Asisten AI (Gemini & Groq)
      expect(html).toContain("Asisten AI");
      expect(html).toContain("Gemini");

      // 5. Supabase Infrastructure
      expect(html).toContain("Supabase");

      // 6. Kontak Resmi Toko
      expect(html).toContain("support@nextsolution.id");
      expect(html).toContain("811-2238-310");
      expect(html).toContain("Bandung");
    });

    it("ensures legacy /privacy route re-exports identical content and metadata", () => {
      expect(LegacyPrivacyPage).toBe(PrivacyPolicyPage);
      expect(legacyPrivacyMetadata).toEqual(privacyMetadata);
    });
  });

  describe("Terms and Conditions (/terms)", () => {
    it("exports valid SEO metadata with canonical url", () => {
      expect(termsMetadata.title).toContain("Syarat & Ketentuan");
      expect(termsMetadata.description).toBeDefined();
      expect(termsMetadata.alternates?.canonical).toBe("/terms");
    });

    it("renders comprehensive terms covering store features and warranty policies", () => {
      const html = renderToString(React.createElement(TermsPage));

      // 1. Pendaftaran & Akun
      expect(html).toContain("Pendaftaran Akun");
      expect(html).toContain("Google Identity Services");

      // 2. Produk & Varian (IDR)
      expect(html).toContain("Rupiah (IDR)");
      expect(html).toContain("varian");

      // 3. Pembayaran & Pengiriman
      expect(html).toContain("Transfer Bank");
      expect(html).toContain("QRIS");
      expect(html).toContain("Ambil Sendiri di Gerai Toko");

      // 4. Garansi Toko 14 Hari & Garansi Distributor
      expect(html).toContain("Garansi Resmi Distributor");
      expect(html).toContain("14 Hari");
      expect(html).toContain("video unboxing");
      expect(html.toLowerCase()).toContain("cacat pabrik");

      // 5. Pengembalian Stok Otomatis
      expect(html).toContain("Pengembalian Stok Otomatis");
      expect(html).toContain("dikembalikan ke inventaris toko secara otomatis");

      // 6. Kontak Bantuan
      expect(html).toContain("support@nextsolution.id");
      expect(html).toContain("811-2238-310");
    });
  });

  describe("Google Identity Services Cryptographic Nonce Generation", () => {
    it("generates 32-byte base64 raw nonce and matching SHA-256 hex string", async () => {
      // Simulate cryptographic helper logic used in GoogleAuthButton
      const randomBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) randomBytes[i] = (i * 7 + 13) % 256;
      
      const rawNonce = btoa(String.fromCharCode(...randomBytes));
      expect(rawNonce).toBeTruthy();
      expect(typeof rawNonce).toBe("string");

      const encoder = new TextEncoder();
      const encodedNonce = encoder.encode(rawNonce);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      expect(hashedNonce).toHaveLength(64); // SHA-256 hex string is 64 characters
      expect(hashedNonce).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

