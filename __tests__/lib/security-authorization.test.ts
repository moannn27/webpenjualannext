/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock next/cache revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// We mock audit log
vi.mock('@/lib/audit-log', () => ({
  recordAdminActivity: vi.fn().mockResolvedValue(undefined),
}));

describe('Security & Authorization Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminAccess & Role Authorization', () => {
    it('returns unauthenticated state for anonymous/guest users', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({ data: { user: null }, error: null }),
        },
      } as any);

      const { getAdminAccess } = await import('@/lib/auth/admin');
      const access = await getAdminAccess();

      expect(access.user).toBeNull();
      expect(access.isAdmin).toBe(false);
      expect(access.role).toBeNull();
    });

    it('identifies customer role correctly without granting admin privileges', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { role: 'customer', full_name: 'Budi Pelanggan' },
        error: null,
      });

      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'cust-123', email: 'cust@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockSingle,
            }),
          }),
        }),
      } as any);

      const { getAdminAccess } = await import('@/lib/auth/admin');
      const access = await getAdminAccess();

      expect(access.user?.id).toBe('cust-123');
      expect(access.isAdmin).toBe(false);
      expect(access.role).toBe('customer');
    });

    it('identifies super_admin role and grants admin privileges', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { role: 'super_admin', full_name: 'Super Admin Utama' },
        error: null,
      });

      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'super-123', email: 'super@example.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockSingle,
            }),
          }),
        }),
      } as any);

      const { getAdminAccess } = await import('@/lib/auth/admin');
      const access = await getAdminAccess();

      expect(access.user?.id).toBe('super-123');
      expect(access.isAdmin).toBe(true);
      expect(access.role).toBe('super_admin');
    });
  });

  describe('requireModulePermission RBAC', () => {
    it('throws Forbidden if caller is anonymous or customer', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'cust-123' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { role: 'customer' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { requireModulePermission } = await import('@/lib/auth/permissions');
      await expect(requireModulePermission('orders')).rejects.toThrow(/Forbidden/);
    });

    it('grants full access to super_admin for any module without restriction', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient)
        .mockResolvedValueOnce({
          auth: {
            getUser: vi.fn().mockResolvedValueOnce({
              data: { user: { id: 'super-123' } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValueOnce({
                  data: { role: 'super_admin' },
                  error: null,
                }),
              }),
            }),
          }),
        } as any)
        .mockResolvedValueOnce({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValueOnce({
                  data: { settings: {} },
                  error: null,
                }),
              }),
            }),
          }),
        } as any);

      const { requireModulePermission } = await import('@/lib/auth/permissions');
      const auth = await requireModulePermission('vouchers');
      expect(auth.isSuperAdmin).toBe(true);
      expect(auth.role).toBe('super_admin');
    });

    it('restricts admin staff when module permission is not granted', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      // 1. getAdminAccess profile call
      // 2. getCurrentAdminPermissions storefront_settings call
      vi.mocked(createClient)
        .mockResolvedValueOnce({
          auth: {
            getUser: vi.fn().mockResolvedValueOnce({
              data: { user: { id: 'staff-456' } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValueOnce({
                  data: { role: 'admin', full_name: 'Staf Order' },
                  error: null,
                }),
              }),
            }),
          }),
        } as any)
        .mockResolvedValueOnce({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValueOnce({
                  data: {
                    settings: {
                      admin_permissions: {
                        'staff-456': ['orders'], // only 'orders', no 'vouchers'
                      },
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        } as any);

      const { requireModulePermission } = await import('@/lib/auth/permissions');
      await expect(requireModulePermission('vouchers')).rejects.toThrow(/Akses ditolak/);
    });
  });

  describe('updateAdminManagedAccountRoleAction Fail-Closed Enforcement', () => {
    it('fails closed and refuses direct table update when RPC is missing or fails', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const updateMock = vi.fn();
      const rpcMock = vi.fn().mockResolvedValueOnce({
        error: { code: 'PGRST202', message: 'function public.admin_update_user_role does not exist' },
      });

      // 1. requireSuperAdmin calls getAdminAccess
      vi.mocked(createClient)
        .mockResolvedValueOnce({
          auth: {
            getUser: vi.fn().mockResolvedValueOnce({
              data: { user: { id: 'super-123' } },
              error: null,
            }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValueOnce({
                  data: { role: 'super_admin', full_name: 'Super Admin' },
                  error: null,
                }),
              }),
            }),
          }),
        } as any)
        // 2. updateAdminManagedAccountRoleAction calls rpc
        .mockResolvedValueOnce({
          rpc: rpcMock,
          from: vi.fn().mockReturnValue({
            update: updateMock,
          }),
        } as any);

      const { updateAdminManagedAccountRoleAction } = await import('@/actions/admin');
      const formData = new FormData();
      formData.set('id', 'cust-to-promote');
      formData.set('role', 'admin');

      const result = await updateAdminManagedAccountRoleAction(formData);

      expect(rpcMock).toHaveBeenCalledWith('admin_update_user_role', {
        p_user_id: 'cust-to-promote',
        p_role: 'admin',
      });
      // Verifikasi: update langsung ke tabel users TIDAK PERNAH dipanggil (fail-closed!)
      expect(updateMock).not.toHaveBeenCalled();
      expect(result).toHaveProperty('error');
      expect(result.error).toMatch(/fail-closed|tidak tersedia/i);
    }, 30000);

    it('rejects attempt when super_admin tries to demote their own account', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'super-123' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { role: 'super_admin', full_name: 'Super Admin' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { updateAdminManagedAccountRoleAction } = await import('@/actions/admin');
      const formData = new FormData();
      formData.set('id', 'super-123'); // same as actor
      formData.set('role', 'customer');

      const result = await updateAdminManagedAccountRoleAction(formData);
      expect(result).toHaveProperty('error');
      expect(result.error).toMatch(/Role akun yang sedang digunakan tidak dapat diturunkan/);
    });

    it('rejects invalid roles that do not belong to the user_role enum', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'super-123' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { role: 'super_admin' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { updateAdminManagedAccountRoleAction } = await import('@/actions/admin');
      const formData = new FormData();
      formData.set('id', 'cust-123');
      formData.set('role', 'arbitrary_root_role');

      const result = await updateAdminManagedAccountRoleAction(formData);
      expect(result).toHaveProperty('error');
      expect(result.error).toMatch(/Role akun tidak valid/);
    });
  });

  describe('Admin Reviews Protection', () => {
    it('rejects unauthorized/customer access to getAllReviewsForAdminAction', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'cust-123' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({
                data: { role: 'customer' },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { getAllReviewsForAdminAction } = await import('@/actions/review');
      await expect(getAllReviewsForAdminAction()).rejects.toThrow(/Forbidden/);
    });
  });

  describe('Customer Order Delivery Confirmation Security', () => {
    it('rejects delivery confirmation if caller is not the owner of the order', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'cust-123' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: 'order-999',
                  user_id: 'cust-other-person', // different user
                  status: 'shipped',
                  courier: 'standard',
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { confirmOrderDeliveredAction } = await import('@/actions/order');
      await expect(confirmOrderDeliveredAction('order-999')).rejects.toThrow(/Akses ditolak/);
    });

    it('rejects delivery confirmation if order is not in shipped or ready_for_pickup status', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValueOnce({
            data: { user: { id: 'cust-123' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: {
                  id: 'order-999',
                  user_id: 'cust-123',
                  status: 'pending', // not shipped or ready_for_pickup
                  courier: 'standard',
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const { confirmOrderDeliveredAction } = await import('@/actions/order');
      await expect(confirmOrderDeliveredAction('order-999')).rejects.toThrow(/Hanya pesanan yang sedang dikirim atau siap diambil/);
    });
  });
});

