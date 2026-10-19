'use server';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireModulePermission, getCurrentAdminPermissions } from '@/lib/auth/permissions';
import { recordAdminActivity } from '@/lib/audit-log';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_ABOUT_US_CONTENT,
  normalizeAboutUsContent,
  type AboutUsContent,
} from '@/lib/about-us';

export async function getAboutUsContentAction(): Promise<AboutUsContent> {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      supabase = getSupabaseAdminClient();
    }

    // 1. Try reading from dedicated about_us_content table if migration is applied
    try {
      const { data: dedicatedData, error: dedicatedErr } = await supabase
        .from('about_us_content')
        .select('content')
        .eq('id', 'default')
        .maybeSingle();

      if (!dedicatedErr && dedicatedData?.content) {
        return normalizeAboutUsContent(dedicatedData.content);
      }
    } catch {
      // Table may not exist yet, fallback below
    }

    // 2. Primary fallback: storefront_settings with id='about'
    try {
      const { data: sfData, error: sfErr } = await supabase
        .from('storefront_settings')
        .select('settings')
        .eq('id', 'about')
        .maybeSingle();

      if (!sfErr && sfData?.settings) {
        return normalizeAboutUsContent(sfData.settings);
      }
    } catch {
      // Ignore
    }

    // 3. Secondary fallback: storefront_settings id='main' settings.about_us
    try {
      const { data: mainData } = await supabase
        .from('storefront_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle();

      if (mainData?.settings?.about_us) {
        return normalizeAboutUsContent(mainData.settings.about_us);
      }
    } catch {
      // Ignore
    }

    return DEFAULT_ABOUT_US_CONTENT;
  } catch (err) {
    console.warn('[getAboutUsContentAction] Falling back to default content:', err);
    return DEFAULT_ABOUT_US_CONTENT;
  }
}

export async function saveAboutUsContentAction(rawContent: AboutUsContent): Promise<{
  success: boolean;
  message: string;
  data: AboutUsContent;
}> {
  await requireModulePermission('content');

  const { user, adminName, role } = await getCurrentAdminPermissions();
  if (!user) {
    throw new Error('Sesi admin tidak valid. Silakan login kembali.');
  }

  const normalized = normalizeAboutUsContent(rawContent);
  const adminClient = getSupabaseAdminClient();

  // 1. Try writing to dedicated table about_us_content
  try {
    await adminClient
      .from('about_us_content')
      .upsert(
        {
          id: 'default',
          content: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
  } catch {
    // If migration has not been applied yet, fallback persists below
  }

  // 2. Try writing to storefront_settings id='about'
  try {
    await adminClient
      .from('storefront_settings')
      .upsert(
        {
          id: 'about',
          settings: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
  } catch {
    // In case id='about' violates constraint, step 3 will guarantee persistence
  }

  // 3. Guaranteed reliable persistence: merge into storefront_settings id='main' under settings.about_us
  try {
    const { data: mainRow } = await adminClient
      .from('storefront_settings')
      .select('settings')
      .eq('id', 'main')
      .maybeSingle();

    const currentMainSettings =
      mainRow?.settings && typeof mainRow.settings === 'object' ? mainRow.settings : {};

    const { error: mainError } = await adminClient
      .from('storefront_settings')
      .upsert(
        {
          id: 'main',
          settings: {
            ...currentMainSettings,
            about_us: normalized,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (mainError) {
      console.error('[saveAboutUsContentAction] Error writing to storefront_settings main:', mainError);
      throw new Error(`Gagal menyimpan ke database: ${mainError.message}`);
    }
  } catch (mainErr) {
    console.error('[saveAboutUsContentAction] Fatal error:', mainErr);
    throw new Error(
      `Gagal menyimpan ke database: ${mainErr instanceof Error ? mainErr.message : String(mainErr)}`
    );
  }

  // 4. Record audit log
  try {
    await recordAdminActivity({
      admin_id: user.id,
      admin_name: adminName || 'Admin',
      admin_role: role || 'admin',
      action: 'update',
      entity_type: 'content',
      entity_name: 'About Us Content',
      details: 'Memperbarui konten halaman Tentang Kami dan tata letak foto interaktif.',
    });
  } catch (logErr) {
    console.warn('[saveAboutUsContentAction] Failed to record audit log:', logErr);
  }

  // Revalidate relevant routes
  revalidatePath('/about');
  revalidatePath('/admin/about');
  revalidatePath('/');

  return {
    success: true,
    message: 'Konten Tentang Kami dan tata letak foto berhasil disimpan!',
    data: normalized,
  };
}

