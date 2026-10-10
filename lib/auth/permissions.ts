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
  permissions: AdminModuleKey[];
  user: any;
}> {
  const { user, isAdmin, role, adminName } = await getAdminAccess();
  if (!user || !isAdmin) {
    return {
      role: null,
      isSuperAdmin: false,
      isAdmin: false,
      adminName: '',
      permissions: [],
      user: null,
    };
  }

  // Super admin always has full privileges over all modules
  if (role === 'super_admin') {
    return {
      role: 'super_admin',
      isSuperAdmin: true,
      isAdmin: true,
      adminName,
      permissions: ALL_ADMIN_MODULES.map((m) => m.key),
      user,
    };
  }

  // Regular admin: read granted permissions from storefront_settings
  const supabase = await createClient();
  const { data } = await supabase
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  const settings = normalizeStorefrontSettings(data?.settings ?? {});
  const userPerms = settings.admin_permissions?.[user.id];

  const permissions: AdminModuleKey[] = Array.isArray(userPerms)
    ? (userPerms as AdminModuleKey[])
    : DEFAULT_ADMIN_PERMISSIONS;

  return {
    role: 'admin',
    isSuperAdmin: false,
    isAdmin: true,
    adminName,
    permissions,
    user,
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

