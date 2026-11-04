import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl, sanitizeReflectedString } from "@/lib/security";

describe("Security Utilities - getSafeRedirectUrl", () => {
  it("allows safe local relative paths", () => {
    expect(getSafeRedirectUrl("/checkout")).toBe("/checkout");
    expect(getSafeRedirectUrl("/profile")).toBe("/profile");
    expect(getSafeRedirectUrl("/admin/orders?status=pending#details")).toBe("/admin/orders?status=pending#details");
  });

  it("blocks protocol-relative URLs (open redirect)", () => {
    expect(getSafeRedirectUrl("//evil.com")).toBe("/profile");
    expect(getSafeRedirectUrl("///evil.com")).toBe("/profile");
  });

  it("blocks backslash bypasses (Windows path confusion)", () => {
    expect(getSafeRedirectUrl("/\\evil.com")).toBe("/profile");
    expect(getSafeRedirectUrl("\\evil.com")).toBe("/profile");
    expect(getSafeRedirectUrl("/%5cevil.com")).toBe("/profile");
    expect(getSafeRedirectUrl("/path\\with\\backslash")).toBe("/profile");
  });

  it("blocks absolute URLs targeting external domains", () => {
    expect(getSafeRedirectUrl("https://evil.com")).toBe("/profile");
    expect(getSafeRedirectUrl("http://attacker.com/login")).toBe("/profile");
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/profile");
  });

  it("uses custom fallback when provided", () => {
    expect(getSafeRedirectUrl("https://evil.com", "/home")).toBe("/home");
    expect(getSafeRedirectUrl(null, "/default")).toBe("/default");
    expect(getSafeRedirectUrl(12345, "/fallback")).toBe("/fallback");
  });
});

describe("Security Utilities - sanitizeReflectedString", () => {
  it("strips injection and scripting characters", () => {
    const dirty = '<script>alert("XSS")</script>';
    const cleaned = sanitizeReflectedString(dirty);
    expect(cleaned).not.toContain("<");
    expect(cleaned).not.toContain(">");
    expect(cleaned).not.toContain('"');
    expect(cleaned).not.toContain("(");
    expect(cleaned).not.toContain(")");
    expect(cleaned).toBe("scriptalertXSS/script");
  });

  it("truncates strings exceeding maxLength", () => {
    const longStr = "a".repeat(500);
    const sanitized = sanitizeReflectedString(longStr, 50);
    expect(sanitized.length).toBe(50);
  });

  it("handles non-string types safely", () => {
    expect(sanitizeReflectedString(null)).toBe("");
    expect(sanitizeReflectedString(undefined)).toBe("");
    expect(sanitizeReflectedString(12345)).toBe("");
  });
});

