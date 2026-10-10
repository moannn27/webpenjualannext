import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeStorefrontSettings, type AdminAuditLog } from '@/lib/storefront-settings';

export type { AdminAuditLog };

export async function recordAdminActivity(params: {
  admin_id: string;
  admin_name: string;
  admin_role: string;
  action: AdminAuditLog['action'];
  entity_type: AdminAuditLog['entity_type'];
  entity_name: string;
  details: string;
}): Promise<void> {
  try {
    const adminClient = getSupabaseAdminClient();
    const { data } = await adminClient
      .from('storefront_settings')
      .select('settings')
      .eq('id', 'main')
      .maybeSingle();

    const currentSettings = normalizeStorefrontSettings(data?.settings ?? {});

    const newLog: AdminAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      admin_id: params.admin_id,
      admin_name: params.admin_name || 'Admin',
      admin_role: params.admin_role || 'admin',
      action: params.action,
      entity_type: params.entity_type,
      entity_name: params.entity_name,
      details: params.details,
      created_at: new Date().toISOString(),
    };

    const existingLogs = Array.isArray(currentSettings.admin_audit_logs)
      ? currentSettings.admin_audit_logs
      : [];

    // Keep the latest 200 activity entries for high performance
    const updatedLogs = [newLog, ...existingLogs].slice(0, 200);

    await adminClient.from('storefront_settings').upsert(
      {
        id: 'main',
        settings: {
          ...currentSettings,
          admin_audit_logs: updatedLogs,
        },
      },
      { onConflict: 'id' }
    );
  } catch (error) {
    // Non-blocking for primary mutations, but logs to console for debugging
    console.error('Failed to record admin activity log:', error);
  }
}

