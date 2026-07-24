import { BaseRepository } from './base'

export class FAQRepository extends BaseRepository {
  async getActiveFAQs() {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    if (error) throw error
    return data
  }
}
