import { FAQRepository } from '@/repositories/faq.repository'

export class FAQService {
  private repo = new FAQRepository()

  async getActiveFAQs() {
    return await this.repo.getActiveFAQs()
  }
}
