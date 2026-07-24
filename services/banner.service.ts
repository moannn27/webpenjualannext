import { BannerRepository } from '@/repositories/banner.repository'

export class BannerService {
  private repo = new BannerRepository()

  async getActiveBanners() {
    return await this.repo.getActiveBanners()
  }
}
