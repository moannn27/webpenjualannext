/**
 * Security utility functions for URL sanitization, open-redirect prevention,
 * and safe query parameter handling.
 */

/**
 * Validates and sanitizes a target redirect URL to protect against Open Redirect (CWE-601).
 * Ensures target is a relative local path on the same origin and rejects scheme-relative,
 * backslash tricks, or encoded bypasses.
 */
export function getSafeRedirectUrl(target: unknown, fallback: string = '/profile'): string {
  if (typeof target !== 'string') return fallback
  const trimmed = target.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.toLowerCase().startsWith('/%5c') ||
    trimmed.includes('\\')
  ) {
    return fallback
  }
  try {
    const parsed = new URL(trimmed, 'http://localhost')
    if (parsed.origin !== 'http://localhost') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

/**
 * Strips HTML tags and suspicious characters from string values to prevent Reflected XSS.
 */
export function sanitizeReflectedString(value: unknown, maxLength: number = 250): string {
  if (typeof value !== 'string') return ''
  return value
    .slice(0, maxLength)
    .replace(/[<>"'`;()]/g, '')
    .trim()
}

