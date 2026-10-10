import { describe, it, expect } from 'vitest';
import {
  normalizePhoneNumber,
  isValidIndonesianPhone,
  getPhoneVariants,
  formatDisplayPhone,
  formatWhatsAppNumber,
} from '@/lib/phone';

describe('Phone utility & anti-abuse deduplication', () => {
  it('normalizes Indonesian numbers starting with 08, +62, and 8 into 628...', () => {
    expect(normalizePhoneNumber('081234567890')).toBe('6281234567890');
    expect(normalizePhoneNumber('+6281234567890')).toBe('6281234567890');
    expect(normalizePhoneNumber('6281234567890')).toBe('6281234567890');
    expect(normalizePhoneNumber('81234567890')).toBe('6281234567890');
    expect(normalizePhoneNumber('0812-3456-7890')).toBe('6281234567890');
    expect(normalizePhoneNumber(' +62 812 3456 7890 ')).toBe('6281234567890');
  });

  it('validates active Indonesian mobile numbers', () => {
    expect(isValidIndonesianPhone('081234567890')).toBe(true);
    expect(isValidIndonesianPhone('+6281234567890')).toBe(true);
    expect(isValidIndonesianPhone('6289912345678')).toBe(true);
    expect(isValidIndonesianPhone('085712345678')).toBe(true);

    // Invalid numbers
    expect(isValidIndonesianPhone('')).toBe(false);
    expect(isValidIndonesianPhone('12345')).toBe(false);
    expect(isValidIndonesianPhone('0217654321')).toBe(false); // Landline
    expect(isValidIndonesianPhone('+14155552671')).toBe(false); // US number
  });

  it('generates all common representations for cross-checking database duplicates', () => {
    const variants = getPhoneVariants('081234567890');
    expect(variants).toContain('6281234567890');
    expect(variants).toContain('081234567890');
    expect(variants).toContain('+6281234567890');
    expect(variants).toContain('81234567890');
  });

  it('formats numbers cleanly for customer UI display and WhatsApp links', () => {
    expect(formatDisplayPhone('6281234567890')).toBe('0812-3456-7890');
    expect(formatWhatsAppNumber('081234567890')).toBe('6281234567890');
  });
});

