'use server'

import { CategoryService } from '@/services/category.service'
import { BrandService } from '@/services/brand.service'

const categoryService = new CategoryService()
const brandService = new BrandService()

export async function getCategoriesAction() {
  return await categoryService.getCategories()
}

export async function getBrandsAction() {
  return await brandService.getBrands()
}
