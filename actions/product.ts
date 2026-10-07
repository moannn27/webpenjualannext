'use server'

import { ProductService } from '@/services/product.service'

const productService = new ProductService()

export async function getProductsAction(options?: { categoryId?: string, brandId?: string, isBestSeller?: boolean, isNewArrival?: boolean }) {
  return await productService.getProducts(options)
}

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
