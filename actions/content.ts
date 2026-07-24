'use server'

import { BannerService } from '@/services/banner.service'
import { FAQService } from '@/services/faq.service'

const bannerService = new BannerService()
const faqService = new FAQService()

export async function getBannersAction() {
  return await bannerService.getActiveBanners()
}

export async function getFAQsAction() {
  return await faqService.getActiveFAQs()
}
