import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLegalContentAction, saveLegalContentAction } from '@/actions/legal';
import { DEFAULT_TERMS_CONTENT } from '@/lib/legal-content';

vi.mock('@/lib/auth/permissions', () => ({
  requireModulePermission: vi.fn(),
  getCurrentAdminPermissions: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/audit-log', () => ({
  recordAdminActivity: vi.fn().mockResolvedValue(true),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Security & Access Control - Legal Content Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized invocation of saveLegalContentAction when permission check fails', async () => {
    const { requireModulePermission } = await import('@/lib/auth/permissions');
    vi.mocked(requireModulePermission).mockRejectedValueOnce(
      new Error('Forbidden: Sesi admin tidak valid atau Anda belum login.')
    );

    await expect(
      saveLegalContentAction('terms', DEFAULT_TERMS_CONTENT)
    ).rejects.toThrow(/Forbidden/i);
  });

  it('rejects saveLegalContentAction if user session is missing from getCurrentAdminPermissions', async () => {
    const { requireModulePermission, getCurrentAdminPermissions } = await import('@/lib/auth/permissions');
    const { normalizeStorefrontSettings } = await import('@/lib/storefront-settings');
    vi.mocked(requireModulePermission).mockResolvedValueOnce({
      user: null as unknown as import('@supabase/supabase-js').User,
      isSuperAdmin: false,
      role: 'admin',
      adminName: '',
    });
    vi.mocked(getCurrentAdminPermissions).mockResolvedValueOnce({
      user: null,
      isSuperAdmin: false,
      isAdmin: false,
      permissions: [],
      adminName: '',
      avatarUrl: '',
      role: null,
      settings: normalizeStorefrontSettings({}),
    });

    await expect(
      saveLegalContentAction('terms', DEFAULT_TERMS_CONTENT)
    ).rejects.toThrow(/Sesi admin tidak valid/i);
  });

  it('getLegalContentAction safely falls back to default terms when database query fails or table missing', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockRejectedValueOnce(new Error('Connection failed'));

    const result = await getLegalContentAction('terms');
    expect(result).toBeDefined();
    expect(result.title).toBe(DEFAULT_TERMS_CONTENT.title);
    expect(result.sections.length).toBe(DEFAULT_TERMS_CONTENT.sections.length);
  });
});
