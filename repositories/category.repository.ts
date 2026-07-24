import { BaseRepository } from './base'

export class CategoryRepository extends BaseRepository {
  async findAll() {
    const supabase = await this.getClient()
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) throw error
    return data
  }
}
