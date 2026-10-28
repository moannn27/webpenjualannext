import sanitizeHtml from "sanitize-html";

export const ALLOWED_RICH_TAGS = [
  "p",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "br",
  "span",
  "a",
  "code",
  "pre",
];

export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_RICH_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    span: ["style"],
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
    blockquote: ["style"],
    ul: ["style"],
    ol: ["style"],
    li: ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^left$/, /^center$/, /^right$/, /^justify$/],
      color: [/^#(0x)?[0-9a-f]{3,8}$/i, /^rgb\(/i, /^rgba\(/i],
      "background-color": [/^#(0x)?[0-9a-f]{3,8}$/i, /^rgb\(/i, /^rgba\(/i],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    a: ["http", "https", "mailto", "tel"],
  },
  transformTags: {
    a: (tagName, attribs) => {
      // Pastikan target="_blank" selalu menyertakan rel="noopener noreferrer"
      if (attribs.target === "_blank") {
        attribs.rel = "noopener noreferrer";
      }
      return { tagName, attribs };
    },
  },
};

/**
 * Membersihkan markup HTML dari database atau editor dengan allowlist ketat.
 * Mencegah XSS, tag <script>, event handler on*, serta protokol javascript:.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/**
 * Mengekstrak teks bersih (plain text) dari konten HTML terformat.
 * Digunakan untuk SEO meta description, alt text, dan structured data.
 */
export function stripHtmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  // Tambahkan spasi pada pergantian elemen blok agar kata-kata tidak menempel
  const separated = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|table)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ");
  const cleaned = sanitizeHtml(separated, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Menormalkan konten: jika data lama adalah plain text tanpa tag HTML,
 * ubah enter/baris baru menjadi format paragraf <p>.
 * Jika sudah memiliki markup HTML, bersihkan via sanitizer.
 */
export function normalizeRichTextContent(content: string | null | undefined): string {
  if (!content) return "";
  const trimmed = content.trim();
  const hasHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  if (!hasHtml) {
    const paragraphs = trimmed
      .split(/\r?\n\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!paragraphs.length) return "";
    return paragraphs
      .map((p) => `<p>${p.replace(/\r?\n/g, "<br />")}</p>`)
      .join("");
  }

  return sanitizeRichText(trimmed);
}
