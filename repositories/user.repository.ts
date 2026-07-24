import { BaseRepository } from './base'

export class UserRepository extends BaseRepository {
  async getProfile(userId: string) {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  }

  async updateProfile(userId: string, data: any) {
    const supabase = await this.getClient()
    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId)
    if (error) throw error
  }
}
