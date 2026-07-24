import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

export abstract class BaseRepository {
  protected async getClient(): Promise<SupabaseClient> {
    return await createClient();
  }
}
