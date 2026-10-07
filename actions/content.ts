'use server'

import { BannerService } from '@/services/banner.service'
import { FAQService } from '@/services/faq.service'
import { TestimonialService } from '@/services/testimonial.service'
import { createClient } from '@/lib/supabase/server'

const bannerService = new BannerService()
const faqService = new FAQService()
const testimonialService = new TestimonialService()

export async function getBannersAction() {
  return await bannerService.getActiveBanners()
}

export async function getFAQsAction() {
  return await faqService.getActiveFAQs()
}

export async function getTestimonialsAction() {
  return await testimonialService.getActive()
}

export async function getStorefrontSettingsAction() {
  const supabase = await createClient()
  const { data } = await supabase.from('storefront_settings').select('settings').eq('id', 'main').maybeSingle()
  return data?.settings ?? null
}
