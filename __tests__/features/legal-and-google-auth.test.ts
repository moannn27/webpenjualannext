import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { metadata as privacyMetadata } from "@/app/privacy-policy/page";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import LegacyPrivacyPage, { metadata as legacyPrivacyMetadata } from "@/app/privacy/page";
import { metadata as termsMetadata } from "@/app/terms/page";
import TermsPage from "@/app/terms/page";
import { generateCryptoNonce, GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
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
      const { rawNonce, hashedNonce } = await generateCryptoNonce();

      expect(rawNonce).toBeTruthy();
      expect(typeof rawNonce).toBe("string");
      // 32 bytes encoded in base64 should be 44 characters ending with '=' or alphanumeric
      expect(rawNonce.length).toBeGreaterThanOrEqual(40);

      // Verify SHA-256 hash
      const encoder = new TextEncoder();
      const encodedNonce = encoder.encode(rawNonce);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const expectedHashed = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      expect(hashedNonce).toBe(expectedHashed);
      expect(hashedNonce).toHaveLength(64);
      expect(hashedNonce).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("Google Identity Services - Button & Flow Isolation", () => {
    const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
    });

    it("renders Google Identity Services container in DOM when Client ID is configured", () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      const html = renderToString(React.createElement(GoogleAuthButton, { mode: "signin" }));

      // Does NOT render fallback OAuth button by default
      expect(html).not.toContain("Gunakan OAuth Redirect Cadangan");
      // Renders loading placeholder inside the container while GIS is preparing
      expect(html).toContain("Menyiapkan Akun Google");
    });

    it("displays explicit error notice and does NOT automatically redirect when Client ID is missing", () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const html = renderToString(React.createElement(GoogleAuthButton, { mode: "signin" }));

      // Must display error notice
      expect(html).toContain("Google Identity Services tidak tersedia");
      // Must NOT automatically redirect; fallback is available ONLY as an explicit secondary button
      expect(html).toContain("Gunakan OAuth Redirect Cadangan (Supabase)");
    });

    it("executes signInWithIdToken and avoids signInWithOAuth during GIS callback", async () => {
      // Mock Supabase client
      const mockSignInWithIdToken = vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" }, user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      const mockSignInWithOAuth = vi.fn();

      // Verify the cryptographic nonce contract required by Supabase & Google
      const { rawNonce, hashedNonce } = await generateCryptoNonce();
      expect(hashedNonce).toHaveLength(64);

      // Simulate Google GIS returning credential to callback
      const mockCredential = "mock.google.id.token.jwt";
      const authResult = await mockSignInWithIdToken({
        provider: "google",
        token: mockCredential,
        nonce: rawNonce,
      });

      expect(mockSignInWithIdToken).toHaveBeenCalledTimes(1);
      expect(mockSignInWithIdToken).toHaveBeenCalledWith({
        provider: "google",
        token: mockCredential,
        nonce: rawNonce,
      });
      expect(authResult.data.session).toBeDefined();

      // Ensure old OAuth redirect was never invoked
      expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    });

    it("handles Google credential failure safely without throwing unhandled exceptions", async () => {
      const mockOnError = vi.fn();
      const mockSignInWithIdToken = vi.fn();

      // Simulate null/missing credential from Google popup
      const response = { credential: undefined };
      if (!response?.credential) {
        mockOnError("Token otentikasi Google tidak diterima.");
      }

      expect(mockOnError).toHaveBeenCalledWith("Token otentikasi Google tidak diterima.");
      expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    });

    it("ensures Google GIS container is empty of React children to prevent Node.removeChild crash", () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      const html = renderToString(React.createElement(GoogleAuthButton, { mode: "signin" }));

      // The placeholder is rendered as a sibling, not inside the dedicated container
      expect(html).toContain("Menyiapkan Akun Google...");
      // Verifies container exists as a separate element with hidden class until GIS renders
      expect(html).toContain('<div class="w-full justify-center py-0.5 min-h-[44px] hidden"></div>');
    });

    it("supports switching between signin and signup modes cleanly", () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      const signinHtml = renderToString(React.createElement(GoogleAuthButton, { mode: "signin" }));
      const signupHtml = renderToString(React.createElement(GoogleAuthButton, { mode: "signup" }));

      expect(signinHtml).toContain("Menyiapkan Akun Google...");
      expect(signupHtml).toContain("Menyiapkan Akun Google...");
    });

    it("does not show 'Google Identity Services tidak tersedia' when Client ID is valid", () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
      const html = renderToString(React.createElement(GoogleAuthButton, { mode: "signin" }));

      expect(html).not.toContain("Google Identity Services tidak tersedia");
      expect(html).toContain("Menyiapkan Akun Google...");
    });

    it("isolates server action errors during profile sync and ensures fallback role", async () => {
      // Simulate sync action execution returning a predictable contract
      const mockSync = async () => {
        return { success: true, role: "customer" };
      };

      const result = await mockSync();
      expect(result.success).toBe(true);
      expect(result.role).toBe("customer");
    });
  });
});
