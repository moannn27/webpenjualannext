'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAdminAccess } from '@/lib/auth/admin';
import { ALL_ADMIN_MODULES, type AdminModuleKey, DEFAULT_ADMIN_PERMISSIONS } from '@/types/admin-permissions';
import { normalizeStorefrontSettings, type AdminAuditLog } from '@/lib/storefront-settings';
import { recordAdminActivity } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';

async function requireSuperAdminAccess() {
  const { user, role, adminName } = await getAdminAccess();
  if (!user || role !== 'super_admin') {
    throw new Error('Akses ditolak: Hanya Super Admin yang dapat mengelola hak akses staf admin.');
  }
  return { user, adminName };
}

export async function getAdminStaffPermissionsAction() {
  const { user, isAdmin, role } = await getAdminAccess();
  if (!user || !isAdmin) throw new Error('Forbidden');

  const supabase = await createClient();
  const { data: sfData } = await supabase
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  const settings = normalizeStorefrontSettings(sfData?.settings ?? {});
  const permsMap = settings.admin_permissions ?? {};

  // Get all users who are admin or super_admin
  const { data: adminUsers, error } = await supabase
    .from('users')
    .select('id, full_name, phone, role, created_at')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const staff = (adminUsers ?? []).map((u) => ({
    ...u,
    permissions:
      u.role === 'super_admin'
        ? ALL_ADMIN_MODULES.map((m) => m.key)
        : permsMap[u.id] || DEFAULT_ADMIN_PERMISSIONS,
  }));

  return {
    staff,
    isSuperAdmin: role === 'super_admin',
    allModules: ALL_ADMIN_MODULES,
  };
}

export async function saveAdminPermissionsAction(input: {
  adminUserId: string;
  permissions: AdminModuleKey[];
}) {
  const { user, adminName } = await requireSuperAdminAccess();
  const { adminUserId, permissions } = input;

  if (!adminUserId) throw new Error('ID Admin tidak valid.');

  const adminClient = getSupabaseAdminClient();

  // Verify target user is an admin
  const { data: targetUser, error: userError } = await adminClient
    .from('users')
    .select('id, full_name, role')
    .eq('id', adminUserId)
    .single();

  if (userError || !targetUser) throw new Error('Akun admin tidak ditemukan.');
  if (targetUser.role === 'super_admin') {
    throw new Error('Super Admin selalu memiliki akses penuh ke seluruh modul.');
  }

  // Validate permission keys
  const validKeys = new Set(ALL_ADMIN_MODULES.map((m) => m.key));
  const sanitizedPerms = Array.from(new Set(permissions)).filter((p) =>
    validKeys.has(p)
  );

  const { data: sfData } = await adminClient
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  const currentSettings = normalizeStorefrontSettings(sfData?.settings ?? {});
  const currentPermissions = { ...(currentSettings.admin_permissions ?? {}) };

  currentPermissions[adminUserId] = sanitizedPerms;

  const { error: updateError } = await adminClient.from('storefront_settings').upsert(
    {
      id: 'main',
      settings: {
        ...currentSettings,
        admin_permissions: currentPermissions,
      },
    },
    { onConflict: 'id' }
  );

  if (updateError) throw new Error(updateError.message);

  const targetName = targetUser.full_name || 'Admin';
  const permsLabels = sanitizedPerms
    .map((k) => ALL_ADMIN_MODULES.find((m) => m.key === k)?.label || k)
    .join(', ');

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: 'super_admin',
    action: 'update',
    entity_type: 'account',
    entity_name: targetName,
    details: `Memperbarui hak akses admin "${targetName}": [${permsLabels || 'Tidak ada modul'}]`,
  });

  revalidatePath('/admin/customers');
  revalidatePath('/admin');
  return { success: true };
}

export async function getAdminAuditLogsAction(): Promise<AdminAuditLog[]> {
  const { user, isAdmin } = await getAdminAccess();
  if (!user || !isAdmin) throw new Error('Forbidden');

  const supabase = await createClient();
  const { data } = await supabase
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  const settings = normalizeStorefrontSettings(data?.settings ?? {});
  return Array.isArray(settings.admin_audit_logs) ? settings.admin_audit_logs : [];
}

export async function clearAdminAuditLogsAction() {
  const { user, adminName } = await requireSuperAdminAccess();
  const adminClient = getSupabaseAdminClient();

  const { data } = await adminClient
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  const settings = normalizeStorefrontSettings(data?.settings ?? {});

  await adminClient.from('storefront_settings').upsert(
    {
      id: 'main',
      settings: {
        ...settings,
        admin_audit_logs: [],
      },
    },
    { onConflict: 'id' }
  );

  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: 'super_admin',
    action: 'delete',
    entity_type: 'settings',
    entity_name: 'Log Aktivitas',
    details: 'Membersihkan riwayat log aktivitas admin.',
  });

  revalidatePath('/admin/logs');
  return { success: true };
}

