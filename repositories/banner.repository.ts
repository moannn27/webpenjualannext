import { BaseRepository } from './base'

export class BannerRepository extends BaseRepository {
  async getActiveBanners() {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    if (error) throw error
    return data
  }
}
