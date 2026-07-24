import { BaseRepository } from './base'

export class BrandRepository extends BaseRepository {
  async findAll() {
    const supabase = await this.getClient()
    const { data, error } = await supabase.from('brands').select('*').order('name')
    if (error) throw error
    return data
  }
}
