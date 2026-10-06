import { UserRepository } from '@/repositories/user.repository'

export class UserService {
  private repo = new UserRepository()

  async getProfile(userId: string) {
    return await this.repo.getProfile(userId)
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    await this.repo.updateProfile(userId, data)
  }
}
