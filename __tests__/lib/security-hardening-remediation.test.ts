/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock audit-log
vi.mock('@/lib/audit-log', () => ({
  recordAdminActivity: vi.fn().mockResolvedValue(undefined),
}))

// Mock auth modules

vi.mock('@/lib/auth/permissions', () => ({
  getCurrentAdminPermissions: vi.fn(),
  requireModulePermission: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Security Hardening Remediation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  describe('1. Supabase Storage & SVG/HTML Rejection', () => {
    it('blocks dangerous SVG and HTML extensions for avatars', async () => {
      const { updateAdminAvatarAction } = await import('@/actions/admin')
      const adminAuth = await import('@/lib/auth/admin')

      vi.spyOn(adminAuth, 'getAdminAccess').mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' } as any,
        isAdmin: true,
        role: 'admin',
        adminName: 'Admin Staff',
      } as any)

      await expect(
        updateAdminAvatarAction('https://example.com/storage/v1/object/public/avatars/payload.svg')
      ).rejects.toThrow(/SVG\/HTML tidak diizinkan/i)

      await expect(
        updateAdminAvatarAction('https://example.com/storage/v1/object/public/avatars/exploit.html')
      ).rejects.toThrow(/SVG\/HTML tidak diizinkan/i)
    })

    it('permits valid image formats (jpg, png, webp) for avatar URLs', async () => {
      const { updateAdminAvatarAction } = await import('@/actions/admin')
      const adminAuth = await import('@/lib/auth/admin')
      const { createClient } = await import('@/lib/supabase/server')

      vi.spyOn(adminAuth, 'getAdminAccess').mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' } as any,
        isAdmin: true,
        role: 'admin',
        adminName: 'Admin Staff',
      } as any)

      const mockUpdateUser = vi.fn().mockResolvedValue({ error: null })
      const mockTableUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      vi.mocked(createClient).mockResolvedValue({
        auth: { updateUser: mockUpdateUser },
        from: vi.fn().mockReturnValue({ update: mockTableUpdate }),
      } as any)

      const result = await updateAdminAvatarAction('https://example.com/storage/avatars/admin-1/photo.webp')
      expect(result.success).toBe(true)
      expect(result.avatarUrl).toContain('photo.webp')
    })
  })

  describe('2. Rate Limiting (/api/recommend)', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('extracts client IP correctly from trusted Vercel proxy and resists header spoofing', async () => {
      const { getClientIp } = await import('@/lib/rate-limit')

      // 1. Vercel trusted header takes precedence over spoofed client headers
      const reqVercel = new Request('http://localhost/api/recommend', {
        headers: {
          'x-vercel-forwarded-for': '203.0.113.195',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8', // Spoofed client attempts
          'cf-connecting-ip': '9.9.9.9',
          'x-real-ip': '8.8.8.8',
        },
      })
      expect(getClientIp(reqVercel)).toBe('203.0.113.195')

      // 2. Standard X-Forwarded-For: Takes rightmost IP appended by outermost reverse proxy
      const reqWithForwarded = new Request('http://localhost/api/recommend', {
        headers: { 'x-forwarded-for': 'fake-spoofed-ip, 70.41.3.18' },
      })
      expect(getClientIp(reqWithForwarded)).toBe('70.41.3.18')
    })

    it('extracts client IP correctly from Netlify trusted proxy (x-nf-client-connection-ip)', async () => {
      vi.stubEnv('NETLIFY', 'true')
      const { getClientIp } = await import('@/lib/rate-limit')

      const reqNetlify = new Request('http://localhost/api/recommend', {
        headers: {
          'x-nf-client-connection-ip': '198.51.100.77',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
          'cf-connecting-ip': '9.9.9.9',
        },
      })
      expect(getClientIp(reqNetlify)).toBe('198.51.100.77')
    })

    it('rejects forgeable headers (cf-connecting-ip, x-real-ip) and falls back safely to 127.0.0.1', async () => {
      const { getClientIp } = await import('@/lib/rate-limit')

      // Forgeable headers without trusted proxy headers should NOT be trusted
      const reqSpoofed = new Request('http://localhost/api/recommend', {
        headers: {
          'cf-connecting-ip': '198.51.100.42',
          'x-real-ip': '192.0.2.1',
        },
      })
      // Must not return 198.51.100.42 or 192.0.2.1
      expect(getClientIp(reqSpoofed)).toBe('127.0.0.1')
    })

    it('in production, persistent rate limiter failure returns unavailable and denies request without in-memory fallback', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const { checkRateLimit } = await import('@/lib/rate-limit')
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')

      // Mock database RPC failure (e.g. RPC not deployed or DB connection timeout)
      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'function check_rate_limit does not exist' } }),
      } as any)

      const result = await checkRateLimit('recommend:203.0.113.50', 15, 60)
      expect(result.allowed).toBe(false)
      expect(result.unavailable).toBe(true)
      expect(result.source).toBe('database')
      expect(result.remaining).toBe(0)
    })

    it('in production, POST /api/recommend returns HTTP 503 when rate limiter is unavailable', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const { POST } = await import('@/app/api/recommend/route')
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')

      // Mock persistent DB failure
      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        rpc: vi.fn().mockRejectedValue(new Error('Connection to database refused')),
      } as any)

      const req = new Request('http://localhost/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-forwarded-for': '203.0.113.88',
        },
        body: JSON.stringify({ message: 'rekomendasi laptop gaming' }),
      })

      const response = await POST(req)
      expect(response.status).toBe(503)

      const json = await response.json()
      expect(json.error).toMatch(/tidak tersedia/i)
      expect(response.headers.get('Retry-After')).toBe('60')
    })

    it('in development, allows in-memory sliding window fallback when database is unavailable', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      const { checkRateLimit } = await import('@/lib/rate-limit')
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')

      // Mock database RPC failure
      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        rpc: vi.fn().mockRejectedValue(new Error('Local DB not running')),
      } as any)

      const testKey = `dev-test-${Date.now()}`
      const res1 = await checkRateLimit(testKey, 2, 60)
      expect(res1.allowed).toBe(true)
      expect(res1.source).toBe('memory')
      expect(res1.remaining).toBe(1)
      expect(res1.unavailable).toBeUndefined()

      const res2 = await checkRateLimit(testKey, 2, 60)
      expect(res2.allowed).toBe(true)
      expect(res2.remaining).toBe(0)

      const res3 = await checkRateLimit(testKey, 2, 60)
      expect(res3.allowed).toBe(false)
      expect(res3.remaining).toBe(0)
    })

    it('uses persistent database RPC response when available', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const { checkRateLimit } = await import('@/lib/rate-limit')
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')

      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: {
            allowed: true,
            count: 5,
            limit: 15,
            remaining: 10,
            reset_seconds: 45,
          },
          error: null,
        }),
      } as any)

      const result = await checkRateLimit('recommend:198.51.100.1', 15, 60)
      expect(result.allowed).toBe(true)
      expect(result.source).toBe('database')
      expect(result.count).toBe(5)
      expect(result.remaining).toBe(10)
      expect(result.resetSeconds).toBe(45)
      expect(result.unavailable).toBeUndefined()
    })
  })

  describe('3. Admin Account Management Strict Authorization', () => {
    it('blocks regular admin from creating another admin account', async () => {
      const { createAdminManagedAccountAction } = await import('@/actions/admin')
      const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')

      // Ordinary admin with customers permission
      vi.mocked(getCurrentAdminPermissions).mockResolvedValueOnce({
        user: { id: 'staff-admin', email: 'staff@example.com' } as any,
        isAdmin: true,
        isSuperAdmin: false,
        role: 'admin',
        adminName: 'Staff Admin',
        permissions: ['customers'],
        settings: {} as any,
        avatarUrl: '',
      })

      const result = await createAdminManagedAccountAction({
        fullName: 'New Staff Admin',
        email: 'newstaff@example.com',
        phone: '081234567890',
        role: 'admin',
      })

      expect(result.error).toMatch(/Hanya Super Admin yang berhak membuat akun staf Admin atau Super Admin/i)
    })

    it('allows super admin to create an admin account', async () => {
      const { createAdminManagedAccountAction } = await import('@/actions/admin')
      const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
      const { createClient: createSupabaseAdminClient } = await import('@supabase/supabase-js')

      // Super Admin
      vi.mocked(getCurrentAdminPermissions).mockResolvedValueOnce({
        user: { id: 'super-admin-id', email: 'super@example.com' } as any,
        isAdmin: true,
        isSuperAdmin: true,
        role: 'super_admin',
        adminName: 'Super Administrator',
        permissions: ['customers'],
        settings: {} as any,
        avatarUrl: '',
      })

      const mockCreateUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'created-admin-id' } },
        error: null,
      })
      const mockUpdateProfile = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      vi.mocked(createSupabaseAdminClient).mockReturnValueOnce({
        auth: { admin: { createUser: mockCreateUser } },
        from: vi.fn().mockReturnValue({ update: mockUpdateProfile }),
      } as any)

      const result = await createAdminManagedAccountAction({
        fullName: 'New Admin Staff',
        email: 'adminstaff@example.com',
        phone: '081234567890',
        role: 'admin',
        password: 'ValidPassword123!',
      })

      expect(result.success).toBe(true)
      expect(mockCreateUser).toHaveBeenCalled()
    })

    it('blocks regular admin from resetting password of another admin', async () => {
      const { setAdminManagedAccountPasswordAction } = await import('@/actions/admin')
      const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
      const { createClient: createSupabaseAdminClient } = await import('@supabase/supabase-js')

      vi.mocked(getCurrentAdminPermissions).mockResolvedValueOnce({
        user: { id: 'staff-admin', email: 'staff@example.com' } as any,
        isAdmin: true,
        isSuperAdmin: false,
        role: 'admin',
        adminName: 'Staff Admin',
        permissions: ['customers'],
        settings: {} as any,
        avatarUrl: '',
      })

      // Target user is an 'admin'
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'peer-admin-id', role: 'admin', full_name: 'Peer Admin' },
        error: null,
      })

      vi.mocked(createSupabaseAdminClient).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockSingle,
            }),
          }),
        }),
      } as any)

      const result = await setAdminManagedAccountPasswordAction({
        userId: 'peer-admin-id',
        newPassword: 'NewSecurePassword123!',
      })

      expect(result.error).toMatch(/Hanya Super Admin yang berhak menyetel password staf Admin atau Super Admin/i)
    })

    it('blocks regular admin from deleting another admin account', async () => {
      const { deleteAdminManagedAccountAction } = await import('@/actions/admin')
      const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
      const { createClient: createSupabaseAdminClient } = await import('@supabase/supabase-js')

      vi.mocked(getCurrentAdminPermissions).mockResolvedValueOnce({
        user: { id: 'staff-admin', email: 'staff@example.com' } as any,
        isAdmin: true,
        isSuperAdmin: false,
        role: 'admin',
        adminName: 'Staff Admin',
        permissions: ['customers'],
        settings: {} as any,
        avatarUrl: '',
      })

      // Target user is an 'admin'
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { id: 'peer-admin-id', role: 'admin', full_name: 'Peer Admin' },
        error: null,
      })

      vi.mocked(createSupabaseAdminClient).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockSingle,
            }),
          }),
        }),
      } as any)

      const result = await deleteAdminManagedAccountAction('peer-admin-id')
      expect(result.error).toMatch(/Hanya Super Admin yang berhak menghapus atau mendemosikan akun staf Admin atau Super Admin/i)
    })

    it('blocks regular admin from unlocking another admin account', async () => {
      const { unlockAdminManagedAccountAction } = await import('@/actions/admin')
      const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
      const { createClient: createSupabaseAdminClient } = await import('@supabase/supabase-js')

      vi.mocked(getCurrentAdminPermissions).mockResolvedValueOnce({
        user: { id: 'staff-admin', email: 'staff@example.com' } as any,
        isAdmin: true,
        isSuperAdmin: false,
        role: 'admin',
        adminName: 'Staff Admin',
        permissions: ['customers'],
        settings: {} as any,
        avatarUrl: '',
      })

      // Target user is an 'admin'
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null,
      })

      vi.mocked(createSupabaseAdminClient).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockSingle,
            }),
          }),
        }),
      } as any)

      const result = await unlockAdminManagedAccountAction('peer-admin-id')
      expect(result.error).toMatch(/Hanya Super Admin yang berhak membuka kunci akun staf Admin atau Super Admin/i)
    })
  })

  describe('4. Password Lockout Server-Side Authority', () => {
    it('prevents password change when server-side app_metadata marks account locked, ignoring client-tampered user_metadata', async () => {
      const { updateUserPasswordAction } = await import('@/actions/user')
      const { createClient } = await import('@/lib/supabase/server')

      // User has tampered with user_metadata to set is_password_locked: false,
      // but authoritative app_metadata retains is_password_locked: true!
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'cust-locked',
                email: 'locked@example.com',
                user_metadata: { is_password_locked: false }, // Forged by client!
                app_metadata: { is_password_locked: true }, // Authoritative server storage!
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_password_locked: true } }),
            }),
          }),
        }),
      } as any)

      const formData = new FormData()
      formData.set('old_password', 'WrongPassword123')
      formData.set('new_password', 'NewPassword123')
      formData.set('confirm_password', 'NewPassword123')

      const result = await updateUserPasswordAction(formData)
      expect(result.isLocked).toBe(true)
      expect(result.error).toContain('Form ubah kata sandi telah dikunci')
    })

    it('locks account after 3 failed password attempts and writes to server-side storage', async () => {
      const { updateUserPasswordAction } = await import('@/actions/user')
      const { createClient } = await import('@/lib/supabase/server')
      const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')

      // User has 2 previous fails
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'cust-123',
                email: 'user@example.com',
                user_metadata: { failed_password_attempts: 2 },
                app_metadata: { failed_password_attempts: 2, is_password_locked: false },
              },
            },
            error: null,
          }),
          signInWithPassword: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid login credentials' },
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { is_password_locked: false } }),
            }),
          }),
        }),
      } as any)

      const mockAdminUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null })
      const mockAdminTableUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          catch: vi.fn().mockResolvedValue(null),
        }),
      })

      vi.mocked(getSupabaseAdminClient).mockReturnValue({
        auth: {
          admin: {
            updateUserById: mockAdminUpdateUser,
          },
        },
        from: vi.fn().mockReturnValue({
          update: mockAdminTableUpdate,
        }),
      } as any)

      const formData = new FormData()
      formData.set('old_password', 'WrongPass!')
      formData.set('new_password', 'NewValidPass123')
      formData.set('confirm_password', 'NewValidPass123')

      const result = await updateUserPasswordAction(formData)
      expect(result.isLocked).toBe(true)
      expect(result.failedCount).toBe(3)

      // Verified write to app_metadata (tamper-proof)
      expect(mockAdminUpdateUser).toHaveBeenCalledWith(
        'cust-123',
        expect.objectContaining({
          app_metadata: expect.objectContaining({
            is_password_locked: true,
            failed_password_attempts: 3,
          }),
        })
      )
    })
  })
})
