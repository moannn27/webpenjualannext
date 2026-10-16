import { BaseRepository } from './base'
import { DEFAULT_FAQS } from '@/constants/defaultFaqs'

export class FAQRepository extends BaseRepository {
  async getActiveFAQs() {
    try {
      const supabase = await this.getClient()
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (!error && data && data.length > 0) {
        return data
      }
    } catch {
      // Graceful fallback to default FAQs
    }
    return DEFAULT_FAQS.map((faq, index) => ({
      id: `default-faq-${index + 1}`,
      question: faq.question,
      answer: faq.answer,
      category: faq.category || null,
      display_order: faq.display_order,
      is_active: faq.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  }
}
