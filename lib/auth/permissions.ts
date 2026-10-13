import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAdminAccess } from '@/lib/auth/admin';
import { normalizeStorefrontSettings } from '@/lib/storefront-settings';
import {
  ALL_ADMIN_MODULES,
  type AdminModuleKey,
  DEFAULT_ADMIN_PERMISSIONS,
} from '@/types/admin-permissions';

export {
  ALL_ADMIN_MODULES,
  type AdminModuleKey,
  DEFAULT_ADMIN_PERMISSIONS,
};

export async function getCurrentAdminPermissions(): Promise<{
  role: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  adminName: string;
  avatarUrl: string;
  permissions: AdminModuleKey[];
  user: User | null;
  settings: ReturnType<typeof normalizeStorefrontSettings>;
}> {
  const { user, isAdmin, role, adminName, avatarUrl } = await getAdminAccess();
  if (!user || !isAdmin) {
    return {
      role: null,
      isSuperAdmin: false,
      isAdmin: false,
      adminName: '',
      avatarUrl: '',
      permissions: [],
      user: null,
      settings: normalizeStorefrontSettings({}),
    };
  }

  let settings = normalizeStorefrontSettings({});
  try {
    const supabase = await createClient();
    if (supabase && typeof supabase.from === 'function') {
      const { data } = await supabase
        .from('storefront_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle();

      if (data?.settings) {
        settings = normalizeStorefrontSettings(data.settings);
      }
    }
  } catch {
    // Fallback to default storefront settings if table or query fails
  }

  // Super admin always has full privileges over all modules
  if (role === 'super_admin') {
    return {
      role: 'super_admin',
      isSuperAdmin: true,
      isAdmin: true,
      adminName,
      avatarUrl,
      permissions: ALL_ADMIN_MODULES.map((m) => m.key),
      user,
      settings,
    };
  }

  // Regular admin: read granted permissions from storefront_settings
  const userPerms = settings.admin_permissions?.[user.id];

  const permissions: AdminModuleKey[] = Array.isArray(userPerms)
    ? (userPerms as AdminModuleKey[])
    : DEFAULT_ADMIN_PERMISSIONS;

  return {
    role: 'admin',
    isSuperAdmin: false,
    isAdmin: true,
    adminName,
    avatarUrl,
    permissions,
    user,
    settings,
  };
}

export async function requireModulePermission(module: AdminModuleKey) {
  const { user, isSuperAdmin, isAdmin, permissions, adminName, role } =
    await getCurrentAdminPermissions();

  if (!user || !isAdmin) {
    throw new Error('Forbidden: Sesi admin tidak valid atau Anda belum login.');
  }

  if (isSuperAdmin) {
    return { user, isSuperAdmin: true, role: 'super_admin', adminName };
  }

  if (!permissions.includes(module)) {
    const moduleDef = ALL_ADMIN_MODULES.find((m) => m.key === module);
    const label = moduleDef ? moduleDef.label : module;
    throw new Error(`Akses ditolak: Anda tidak memiliki izin untuk mengelola fitur "${label}".`);
  }

  return { user, isSuperAdmin: false, role: role || 'admin', adminName };
}

