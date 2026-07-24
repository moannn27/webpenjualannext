import { BrandRepository } from '@/repositories/brand.repository'

export class BrandService {
  private repo = new BrandRepository()

  async getBrands() {
    return await this.repo.findAll()
  }
}
