'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireModulePermission, getCurrentAdminPermissions } from '@/lib/auth/permissions';
import { recordAdminActivity } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_TERMS_CONTENT,
  DEFAULT_PRIVACY_CONTENT,
  normalizeLegalDocument,
  type LegalDocument,
} from '@/lib/legal-content';

export async function getLegalContentAction(type: 'terms' | 'privacy'): Promise<LegalDocument> {
  const fallback = type === 'terms' ? DEFAULT_TERMS_CONTENT : DEFAULT_PRIVACY_CONTENT;

  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      supabase = getSupabaseAdminClient();
    }

    const { data, error } = await supabase
      .from('storefront_settings')
      .select('settings')
      .eq('id', 'main')
      .maybeSingle();

    if (!error && data?.settings) {
      const legal = data.settings.legal as Record<string, unknown> | undefined;
      if (legal && legal[type]) {
        return normalizeLegalDocument(legal[type], fallback);
      }
    }

    return fallback;
  } catch (err) {
    console.warn(`[getLegalContentAction] Failed to read ${type} legal content:`, err);
    return fallback;
  }
}

export async function saveLegalContentAction(
  type: 'terms' | 'privacy',
  rawContent: LegalDocument
): Promise<{
  success: boolean;
  message: string;
  data: LegalDocument;
}> {
  await requireModulePermission('content');

  const { user, adminName, role } = await getCurrentAdminPermissions();
  if (!user) {
    throw new Error('Sesi admin tidak valid. Silakan login kembali.');
  }

  const fallback = type === 'terms' ? DEFAULT_TERMS_CONTENT : DEFAULT_PRIVACY_CONTENT;
  const normalized = normalizeLegalDocument(rawContent, fallback);
  const adminClient = getSupabaseAdminClient();

  const { data: current, error: readError } = await adminClient
    .from('storefront_settings')
    .select('settings')
    .eq('id', 'main')
    .maybeSingle();

  if (readError) {
    throw new Error(`Gagal membaca pengaturan toko: ${readError.message}`);
  }

  const currentSettings = (current?.settings as Record<string, unknown>) || {};
  const currentLegal = (currentSettings.legal as Record<string, unknown>) || {};

  const updatedSettings = {
    ...currentSettings,
    legal: {
      ...currentLegal,
      [type]: normalized,
    },
  };

  const { error: updateError } = await adminClient
    .from('storefront_settings')
    .upsert({
      id: 'main',
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    });

  if (updateError) {
    throw new Error(`Gagal menyimpan dokumen hukum: ${updateError.message}`);
  }

  const docName = type === 'terms' ? 'Syarat & Ketentuan' : 'Kebijakan Privasi';
  await recordAdminActivity({
    admin_id: user.id,
    admin_name: adminName,
    admin_role: role || "admin",
    action: 'update',
    entity_type: 'settings',
    entity_name: docName,
    details: `Memperbarui isi dokumen resmi ${docName} (${normalized.sections.length} bagian)`,
  });

  revalidatePath('/terms');
  revalidatePath('/privacy');
  revalidatePath('/privacy-policy');
  revalidatePath('/admin/legal');
  revalidatePath('/');

  return {
    success: true,
    message: `${docName} berhasil diperbarui.`,
    data: normalized,
  };
}
