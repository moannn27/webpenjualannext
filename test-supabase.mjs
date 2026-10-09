import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetch }
});
console.log('PUBLIC URL:', supabase.storage.from('products').getPublicUrl('test.jpg').data.publicUrl);

