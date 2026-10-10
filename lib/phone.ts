/**
 * Utility functions for Indonesian phone number handling, validation, and anti-abuse deduplication.
 */

export function normalizePhoneNumber(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  // Strip everything except digits and leading plus
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';

  if (digitsOnly.startsWith('62')) {
    return digitsOnly;
  }
  if (digitsOnly.startsWith('0')) {
    return '62' + digitsOnly.slice(1);
  }
  if (digitsOnly.startsWith('8')) {
    return '62' + digitsOnly;
  }
  return digitsOnly;
}

export function isValidIndonesianPhone(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const norm = normalizePhoneNumber(raw);
  // Indonesian mobile numbers start with 628 and have 10-15 digits total
  return /^628\d{8,12}$/.test(norm);
}

export function getPhoneVariants(raw: string | null | undefined): string[] {
  const norm = normalizePhoneNumber(raw);
  if (!norm) return [];

  const rawTrimmed = String(raw || '').trim();
  const set = new Set<string>();

  if (rawTrimmed) set.add(rawTrimmed);
  set.add(norm);

  if (norm.startsWith('62')) {
    const local = '0' + norm.slice(2);
    set.add(local);
    set.add('+' + norm);
    set.add(norm.slice(2));
  }

  return Array.from(set).filter(Boolean);
}

export function formatDisplayPhone(raw: string | null | undefined): string {
  const norm = normalizePhoneNumber(raw);
  if (!norm) return raw ? String(raw).trim() : '';

  if (norm.startsWith('62')) {
    const local = '0' + norm.slice(2);
    if (local.length >= 10 && local.length <= 13) {
      // 0812-3456-7890 format
      return `${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`;
    }
    return local;
  }
  return norm;
}

export function formatWhatsAppNumber(raw: string | null | undefined): string {
  const norm = normalizePhoneNumber(raw);
  return norm.replace(/\D/g, '');
}

