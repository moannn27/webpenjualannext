/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }) }))
vi.mock('@/lib/audit-log', () => ({ recordAdminActivity: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/auth/permissions', () => ({ getCurrentAdminPermissions: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdminClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

describe('account deletion lifecycle', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  function setupDeletion(orderCount: number, targetRole = 'customer', overrides: Record<string, unknown> = {}) {
    const queryLog: Array<{ table: string; method: string; args: unknown[] }> = []
    const storageRemove = vi.fn().mockResolvedValue({ data: [], error: null })
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const targetProfile = { id: 'target-user', full_name: 'Target User', role: targetRole }
    const adminClient = {
      from(table: string) {
        return {
          select(...args: unknown[]) {
            queryLog.push({ table, method: 'select', args })
            if (table === 'users' && (args[1] as { count?: string } | undefined)?.count === 'exact') {
              return { eq: async () => ({ count: 1, error: null }) }
            }
            return {
              eq: () => ({
                maybeSingle: async () => table === 'users'
                  ? { data: targetProfile, error: null }
                  : { data: { settings: {} }, error: null },
                then: undefined,
              }),
            }
          },
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      },
      rpc: vi.fn().mockResolvedValue({
        data: [{ bucket_id: 'avatars', name: 'target/photo.webp' }],
        error: null,
      }),
      storage: { from: vi.fn(() => ({ remove: storageRemove })) },
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'target-user', email: 'target@example.com' } },
            error: null,
          }),
          deleteUser,
        },
      },
      ...overrides,
    }

    // Thenable query used by the order count and the storefront settings lookup.
    const originalFrom = adminClient.from.bind(adminClient)
    adminClient.from = ((table: string) => {
      if (table === 'orders') {
        return {
          select: (...args: unknown[]) => {
            queryLog.push({ table, method: 'select', args })
            return { eq: async () => ({ count: orderCount, error: null }) }
          },
        } as any
      }
      return originalFrom(table) as any
    }) as any

    return { adminClient, deleteUser, queryLog, storageRemove }
  }

  it('reads the email from Auth, then removes the Auth user and owned files for an account without orders', async () => {
    const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
    const { recordAdminActivity } = await import('@/lib/audit-log')
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const fixture = setupDeletion(0)
    vi.mocked(getCurrentAdminPermissions).mockResolvedValue({
      user: { id: 'admin-user', email: 'admin@example.com' } as any,
      isAdmin: true,
      isSuperAdmin: false,
      role: 'admin',
      adminName: 'Admin',
      permissions: ['customers'],
      settings: {} as any,
      avatarUrl: '',
    })
    vi.mocked(getSupabaseAdminClient).mockReturnValue(fixture.adminClient as any)
    vi.mocked(createAdminClient).mockReturnValue(fixture.adminClient as any)

    const { deleteAdminManagedAccountAction } = await import('@/actions/admin')
    const result = await deleteAdminManagedAccountAction('target-user')

    expect(result).toMatchObject({ success: true })
    expect(fixture.deleteUser).toHaveBeenCalledWith('target-user')
    expect(fixture.storageRemove).toHaveBeenCalledWith(['target/photo.webp'])
    expect(recordAdminActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete',
      entity_type: 'account',
      details: expect.stringContaining('data profil nontransaksional'),
    }))
    expect(fixture.queryLog.find((entry) => entry.table === 'users' && entry.method === 'select')?.args[0])
      .toBe('id, full_name, role')
  })

  it('preserves accounts with order history by deleting the Auth identity through the Admin API', async () => {
    const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
    const { recordAdminActivity } = await import('@/lib/audit-log')
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const fixture = setupDeletion(2)
    vi.mocked(getCurrentAdminPermissions).mockResolvedValue({
      user: { id: 'admin-user', email: 'admin@example.com' } as any,
      isAdmin: true,
      isSuperAdmin: false,
      role: 'admin',
      adminName: 'Admin',
      permissions: ['customers'],
      settings: {} as any,
      avatarUrl: '',
    })
    vi.mocked(getSupabaseAdminClient).mockReturnValue(fixture.adminClient as any)
    vi.mocked(createAdminClient).mockReturnValue(fixture.adminClient as any)

    const { deleteAdminManagedAccountAction } = await import('@/actions/admin')
    const result = await deleteAdminManagedAccountAction('target-user')

    expect(result).toMatchObject({ success: true, message: expect.stringContaining('2 riwayat pesanan tetap dipertahankan') })
    expect(fixture.deleteUser).toHaveBeenCalledWith('target-user')
    expect(recordAdminActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete',
      details: expect.stringContaining('mempertahankan 2 pesanan'),
    }))
  })

  it('keeps the account when Storage API cleanup fails', async () => {
    const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const fixture = setupDeletion(0)
    fixture.storageRemove.mockResolvedValueOnce({ data: null, error: { message: 'storage unavailable' } })
    vi.mocked(getCurrentAdminPermissions).mockResolvedValue({
      user: { id: 'admin-user' } as any,
      isAdmin: true,
      isSuperAdmin: false,
      role: 'admin',
      adminName: 'Admin',
      permissions: ['customers'],
      settings: {} as any,
      avatarUrl: '',
    })
    vi.mocked(getSupabaseAdminClient).mockReturnValue(fixture.adminClient as any)
    vi.mocked(createAdminClient).mockReturnValue(fixture.adminClient as any)

    const { deleteAdminManagedAccountAction } = await import('@/actions/admin')
    const result = await deleteAdminManagedAccountAction('target-user')

    expect(result.error).toContain('Akun belum dihapus. Pembersihan file Storage gagal')
    expect(fixture.deleteUser).not.toHaveBeenCalled()
  })

  it('does not report success when Auth deletion fails after Storage cleanup', async () => {
    const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const fixture = setupDeletion(1)
    fixture.deleteUser.mockResolvedValueOnce({ error: { message: 'auth unavailable' } })
    vi.mocked(getCurrentAdminPermissions).mockResolvedValue({
      user: { id: 'admin-user' } as any,
      isAdmin: true,
      isSuperAdmin: false,
      role: 'admin',
      adminName: 'Admin',
      permissions: ['customers'],
      settings: {} as any,
      avatarUrl: '',
    })
    vi.mocked(getSupabaseAdminClient).mockReturnValue(fixture.adminClient as any)
    vi.mocked(createAdminClient).mockReturnValue(fixture.adminClient as any)

    const { deleteAdminManagedAccountAction } = await import('@/actions/admin')
    const result = await deleteAdminManagedAccountAction('target-user')

    expect(fixture.storageRemove).toHaveBeenCalled()
    expect(result).toMatchObject({ error: expect.stringContaining('Akun belum dihapus') })
    expect(result).toMatchObject({ error: expect.stringContaining('File Storage mungkin sudah dibersihkan') })
    expect(result).not.toHaveProperty('success', true)
  })

  it('blocks deletion of the final super admin', async () => {
    const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const fixture = setupDeletion(0, 'super_admin')
    vi.mocked(getCurrentAdminPermissions).mockResolvedValue({
      user: { id: 'admin-user' } as any,
      isAdmin: true,
      isSuperAdmin: true,
      role: 'super_admin',
      adminName: 'Super Admin',
      permissions: ['customers'],
      settings: {} as any,
      avatarUrl: '',
    })
    vi.mocked(createAdminClient).mockReturnValue(fixture.adminClient as any)
    const { deleteAdminManagedAccountAction } = await import('@/actions/admin')

    const result = await deleteAdminManagedAccountAction('target-user')

    expect(result.error).toContain('Super Admin terakhir')
    expect(fixture.deleteUser).not.toHaveBeenCalled()
    expect(fixture.adminClient.rpc).not.toHaveBeenCalled()
  })

  it('rejects callers without server-verified admin access', async () => {
    const { getCurrentAdminPermissions } = await import('@/lib/auth/permissions')
    const { deleteAdminManagedAccountAction } = await import('@/actions/admin')
    vi.mocked(getCurrentAdminPermissions).mockResolvedValue({
      user: { id: 'customer-user' } as any,
      isAdmin: false,
      isSuperAdmin: false,
      role: 'customer',
      adminName: 'Customer',
      permissions: [],
      settings: {} as any,
      avatarUrl: '',
    })

    await expect(deleteAdminManagedAccountAction('target-user')).rejects.toThrow('Forbidden')
  })
})

describe('deleted-session guard', () => {
  it('denies stale JWTs after the profile row has been removed and fails closed on lookup errors', async () => {
    const { getActiveUserProfileStatus } = await import('@/lib/auth/active-profile')
    const makeClient = (data: { id: string } | null, error: unknown = null) => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data, error }) })),
        })),
      })),
    })

    expect(await getActiveUserProfileStatus(makeClient({ id: 'user-1' }) as any, 'user-1')).toBe('active')
    expect(await getActiveUserProfileStatus(makeClient(null) as any, 'user-1')).toBe('missing')
    expect(await getActiveUserProfileStatus(makeClient(null, new Error('database unavailable')) as any, 'user-1')).toBe('unavailable')
  })
})

describe('delete confirmation submission', () => {
  it('accepts only the first in-flight confirmation request', async () => {
    const { runSingleFlight } = await import('@/lib/async/single-flight')
    const lock = { current: false }
    let release!: (value: string) => void
    const operation = vi.fn(() => new Promise<string>((resolve) => { release = resolve }))

    const first = runSingleFlight(lock, operation)
    const second = await runSingleFlight(lock, operation)
    expect(second).toEqual({ accepted: false })
    expect(operation).toHaveBeenCalledTimes(1)

    release('deleted')
    await expect(first).resolves.toEqual({ accepted: true, value: 'deleted' })
    expect(lock.current).toBe(false)
  })
})

describe('Google password setup', () => {
  it('sets a password on the authenticated Google identity without signing in or creating a new user', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const updateUser = vi.fn().mockResolvedValue({ error: null })
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: {
          id: 'google-user',
          email: 'google@example.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          identities: [{ provider: 'google' }],
        } } }),
        updateUser,
      },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { is_password_locked: false } }) })) })) })),
    }
    vi.mocked(createClient).mockResolvedValue(client as any)
    vi.mocked(getSupabaseAdminClient).mockImplementation(() => { throw new Error('service unavailable') })
    const { updateUserPasswordAction } = await import('@/actions/user')
    const form = new FormData()
    form.set('new_password', 'ValidPass123')
    form.set('confirm_password', 'ValidPass123')

    const result = await updateUserPasswordAction(form)

    expect(result.success).toBe(true)
    expect(updateUser).toHaveBeenCalledWith({ password: 'ValidPass123' })
    expect(client.auth.getUser).toHaveBeenCalledTimes(1)
  })

  it('rejects missing, short, and mismatched passwords without sending them to Auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const updateUser = vi.fn()
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: {
          id: 'google-user', email: 'google@example.com',
          app_metadata: { provider: 'google', providers: ['google'] }, identities: [{ provider: 'google' }],
        } } }),
        updateUser,
      },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { is_password_locked: false } }) })) })) })),
    }
    vi.mocked(createClient).mockResolvedValue(client as any)
    const { updateUserPasswordAction } = await import('@/actions/user')
    const form = new FormData()
    form.set('new_password', 'short')
    form.set('confirm_password', 'different')

    const result = await updateUserPasswordAction(form)

    expect(result.error).toBeTruthy()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('rejects an expired or missing session and surfaces Auth API errors', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const noSession = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } }
    vi.mocked(createClient).mockResolvedValue(noSession as any)
    const { updateUserPasswordAction } = await import('@/actions/user')
    const form = new FormData()
    form.set('new_password', 'ValidPass123')
    form.set('confirm_password', 'ValidPass123')
    await expect(updateUserPasswordAction(form)).rejects.toThrow('Unauthorized')

    const apiFailure = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: {
          id: 'google-user', email: 'google@example.com',
          app_metadata: { provider: 'google', providers: ['google'] }, identities: [{ provider: 'google' }],
        } } }),
        updateUser: vi.fn().mockResolvedValue({ error: { message: 'password policy rejected' } }),
      },
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { is_password_locked: false } }) })) })) })),
    }
    vi.mocked(createClient).mockResolvedValue(apiFailure as any)
    expect(await updateUserPasswordAction(form)).toMatchObject({ error: 'password policy rejected' })
  })
})

describe('login continuity and generic credential errors', () => {
  it('shows the Google recovery hint without revealing account/provider existence', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } }) },
    } as any)
    const { login } = await import('@/actions/auth')
    const form = new FormData()
    form.set('email', 'person@example.com')
    form.set('password', 'bad-password')

    const result = await login(form)

    expect(result.error).toContain('Jika Anda sebelumnya mendaftar menggunakan Google')
    expect(result.error).not.toMatch(/email (terdaftar|ditemukan)|provider|Google account/i)
  })

  it('keeps Google OAuth available after password setup', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { url: 'https://accounts.google.test/oauth' }, error: null })
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithOAuth } } as any)
    const { loginWithGoogle } = await import('@/actions/auth')

    await expect(loginWithGoogle('/profile?tab=settings')).rejects.toThrow('NEXT_REDIRECT:https://accounts.google.test/oauth')
    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }))
  })
})
