'use server'

import { ProductService } from '@/services/product.service'
import type { CatalogFilterParams } from '@/lib/catalog-filters'

const productService = new ProductService()

export async function getProductsAction(options?: { categoryId?: string, brandId?: string, isBestSeller?: boolean, isNewArrival?: boolean }) {
  return await productService.getProducts(options)
}

export async function getProductsPageAction(options: { page: number; pageSize: number; categoryId?: string; brandId?: string; search?: string; promoOnly?: boolean; sort?: string; filters?: CatalogFilterParams }) {
  return await productService.getProductsPage(options)
}

export async function getProductsByIdsAction(ids: string[]) { return await productService.getProductsByIds(ids) }
export async function getPromoProductsAction(limit = 8) { return await productService.getPromoProducts(limit) }

export async function getProductBySlugAction(slug: string) {
  return await productService.getProductBySlug(slug)
}

export async function getProductByIdAction(id: string) {
  return await productService.getProductById(id)
}

export async function searchProductsAction(query: string) {
  return await productService.searchProducts(query)
}

export async function getFeaturedProductsAction() {
  return await productService.getFeaturedProducts()
}

export async function getBestSellerAction() {
  return await productService.getBestSeller()
}

export async function getNewArrivalAction() {
  return await productService.getNewArrival()
}
