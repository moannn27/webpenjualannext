import { CategoryRepository } from '@/repositories/category.repository'

export class CategoryService {
  private repo = new CategoryRepository()

  async getCategories() {
    return await this.repo.findAll()
  }
}
