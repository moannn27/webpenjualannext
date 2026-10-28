import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  sanitizeRichText,
  stripHtmlToPlainText,
  normalizeRichTextContent,
  ALLOWED_RICH_TAGS,
} from "@/lib/sanitize-html";
import { RichTextRenderer } from "@/components/shared/RichTextRenderer";

describe("Rich Text Editor & Sanitization Module", () => {
  describe("sanitizeRichText", () => {
    it("exports ALLOWED_RICH_TAGS containing standard safe tags and excluding scripts", () => {
      expect(ALLOWED_RICH_TAGS).toContain("p");
      expect(ALLOWED_RICH_TAGS).toContain("strong");
      expect(ALLOWED_RICH_TAGS).toContain("a");
      expect(ALLOWED_RICH_TAGS).not.toContain("script");
    });
    it("strips malicious <script> tags and harmful executable code", () => {
      const maliciousHtml = '<p>Halo dunia<script>alert("XSS")</script></p>';
      const sanitized = sanitizeRichText(maliciousHtml);
      expect(sanitized).toBe("<p>Halo dunia</p>");
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("alert");
    });

    it("strips inline event handlers like onerror, onclick, onmouseover", () => {
      const xssHtml = '<p onclick="stealCookies()">Teks normal <img src="invalid.jpg" onerror="alert(1)" /></p>';
      const sanitized = sanitizeRichText(xssHtml);
      expect(sanitized).not.toContain("onclick");
      expect(sanitized).not.toContain("onerror");
      expect(sanitized).not.toContain("stealCookies");
      expect(sanitized).not.toContain("<img");
    });

    it("strips javascript: protocol pseudo-URLs in links", () => {
      const dangerousLink = '<a href="javascript:alert(1)">Klik Disini</a>';
      const sanitized = sanitizeRichText(dangerousLink);
      expect(sanitized).not.toContain("javascript:");
      // Either removes the anchor or removes the href attribute
      expect(sanitized).toBe("<a>Klik Disini</a>");
    });

    it("preserves valid links and enforces rel='noopener noreferrer' on target='_blank'", () => {
      const validLink = '<p><a href="https://nextsolution.id" target="_blank">Next Solution</a></p>';
      const sanitized = sanitizeRichText(validLink);
      expect(sanitized).toContain('href="https://nextsolution.id"');
      expect(sanitized).toContain('target="_blank"');
      expect(sanitized).toContain('rel="noopener noreferrer"');
    });

    it("preserves formatting tags: bold, italic, underline, lists, headings, blockquote", () => {
      const richHtml = '<h2>Judul</h2><p><strong>Tebal</strong>, <em>Miring</em>, <u>Garis Bawah</u>, <s>Coret</s></p><ul><li>Item 1</li><li>Item 2</li></ul><blockquote>Kutipan</blockquote><hr />';
      const sanitized = sanitizeRichText(richHtml);
      expect(sanitized).toContain("<h2>Judul</h2>");
      expect(sanitized).toContain("<strong>Tebal</strong>");
      expect(sanitized).toContain("<em>Miring</em>");
      expect(sanitized).toContain("<u>Garis Bawah</u>");
      expect(sanitized).toContain("<s>Coret</s>");
      expect(sanitized).toContain("<ul><li>Item 1</li><li>Item 2</li></ul>");
      expect(sanitized).toContain("<blockquote>Kutipan</blockquote>");
      expect(sanitized).toContain("<hr />");
    });

    it("preserves safe inline styling like text-align, color, and background-color", () => {
      const styledHtml = '<p style="text-align: center"><span style="color: #2563eb; background-color: #fef08a">Warna Teks</span></p>';
      const sanitized = sanitizeRichText(styledHtml);
      expect(sanitized).toContain('text-align:center');
      expect(sanitized).toContain('color:#2563eb');
      expect(sanitized).toContain('background-color:#fef08a');
    });

    it("strips disallowed styles like position, z-index, or font-size manipulation", () => {
      const hackerStyle = '<p style="position: fixed; top: 0; z-index: 9999; text-align: right">Halo</p>';
      const sanitized = sanitizeRichText(hackerStyle);
      expect(sanitized).not.toContain("position");
      expect(sanitized).not.toContain("z-index");
      expect(sanitized).toContain("text-align:right");
    });

    it("handles null, undefined, or empty string gracefully", () => {
      expect(sanitizeRichText(null)).toBe("");
      expect(sanitizeRichText(undefined)).toBe("");
      expect(sanitizeRichText("")).toBe("");
    });
  });

  describe("stripHtmlToPlainText", () => {
    it("extracts pure plain text from rich HTML for SEO and meta descriptions", () => {
      const richHtml = '<h2>Laptop Asus ROG</h2><p>Performa <strong>ekstrem</strong> untuk <em>gaming</em> dan render video 4K.</p><ul><li>RAM 32GB</li><li>SSD 1TB</li></ul>';
      const plain = stripHtmlToPlainText(richHtml);
      expect(plain).toBe("Laptop Asus ROG Performa ekstrem untuk gaming dan render video 4K. RAM 32GB SSD 1TB");
      expect(plain).not.toContain("<");
      expect(plain).not.toContain(">");
    });

    it("collapses multi-line and extra whitespace into single spaces", () => {
      const messyHtml = '<p>Baris satu</p>\n\n   <p>   Baris    dua   </p>';
      const plain = stripHtmlToPlainText(messyHtml);
      expect(plain).toBe("Baris satu Baris dua");
    });

    it("returns empty string for null, undefined, or empty inputs", () => {
      expect(stripHtmlToPlainText(null)).toBe("");
      expect(stripHtmlToPlainText(undefined)).toBe("");
      expect(stripHtmlToPlainText("   ")).toBe("");
    });
  });

  describe("normalizeRichTextContent", () => {
    it("converts legacy plain text with double newlines into paragraph tags", () => {
      const legacyText = "Paragraf pertama produk.\n\nParagraf kedua spesifikasi laptop.";
      const normalized = normalizeRichTextContent(legacyText);
      expect(normalized).toBe("<p>Paragraf pertama produk.</p><p>Paragraf kedua spesifikasi laptop.</p>");
    });

    it("converts single newlines inside paragraphs into <br /> tags", () => {
      const legacyText = "Baris 1\nBaris 2";
      const normalized = normalizeRichTextContent(legacyText);
      expect(normalized).toBe("<p>Baris 1<br />Baris 2</p>");
    });

    it("preserves already formatted HTML without double-encoding", () => {
      const htmlText = "<p>Paragraf yang sudah <strong>HTML</strong>.</p>";
      const normalized = normalizeRichTextContent(htmlText);
      expect(normalized).toBe("<p>Paragraf yang sudah <strong>HTML</strong>.</p>");
    });

    it("handles empty or whitespace strings", () => {
      expect(normalizeRichTextContent("")).toBe("");
      expect(normalizeRichTextContent("   ")).toBe("");
      expect(normalizeRichTextContent(null)).toBe("");
    });
  });

  describe("RichTextRenderer component", () => {
    it("renders sanitized HTML markup wrapped in .rich-content class", () => {
      const content = "<p>Spesifikasi <strong>terbaik</strong> di kelasnya.</p>";
      const html = renderToString(React.createElement(RichTextRenderer, { content }));
      expect(html).toContain('class="rich-content');
      expect(html).toContain("<p>Spesifikasi <strong>terbaik</strong> di kelasnya.</p>");
    });

    it("renders legacy plain text as formatted paragraphs seamlessly", () => {
      const legacyContent = "Baris 1\n\nBaris 2";
      const html = renderToString(React.createElement(RichTextRenderer, { content: legacyContent }));
      expect(html).toContain("<p>Baris 1</p><p>Baris 2</p>");
    });

    it("renders fallback when content is empty or null", () => {
      const html = renderToString(
        React.createElement(RichTextRenderer, {
          content: null,
          fallback: React.createElement("span", null, "Deskripsi belum tersedia"),
        })
      );
      expect(html).toContain("<span>Deskripsi belum tersedia</span>");
      expect(html).not.toContain("rich-content");
    });

    it("strips XSS attempts before rendering to client", () => {
      const unsafeContent = '<p>Halo <script>alert("hack")</script><img src="x" onerror="alert(1)" /></p>';
      const html = renderToString(React.createElement(RichTextRenderer, { content: unsafeContent }));
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("alert");
      expect(html).not.toContain("onerror");
      expect(html).toContain("<p>Halo </p>");
    });
  });
});

