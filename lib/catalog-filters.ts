export type CatalogSearchParams = {
  search?: string; category?: string; brand?: string; promo?: string; sort?: string; page?: string;
  price_min?: string; price_max?: string; processor?: string; ram?: string; storage?: string; gpu?: string; display?: string; stock?: string;
}

export type RawCatalogSearchParams = { [key: string]: string | string[] | undefined }

const queryKeys: (keyof CatalogSearchParams)[] = ['search', 'category', 'brand', 'promo', 'sort', 'page', 'price_min', 'price_max', 'processor', 'ram', 'storage', 'gpu', 'display', 'stock']

export function normalizeCatalogSearchParams(raw: RawCatalogSearchParams): CatalogSearchParams {
  const result: CatalogSearchParams = {}
  for (const key of queryKeys) {
    const value = raw[key]
    if (typeof value === 'string') result[key] = value
    else if (Array.isArray(value) && typeof value[0] === 'string') result[key] = value[0]
  }
  if (result.category && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.category)) delete result.category
  if (result.brand && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.brand)) delete result.brand
  if (result.sort && !['newest', 'popular', 'price-low', 'price-high'].includes(result.sort)) delete result.sort
  if (result.promo !== '1') delete result.promo
  return result
}

export type CatalogFilterParams = {
  priceMin: number | null; priceMax: number | null; processor: string | null; ram: string | null;
  storage: string | null; gpu: string | null; display: string | null; inStock: boolean | null;
}

function parsePrice(value?: string): number | null {
  if (!value?.trim()) return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 && amount <= 9999999999.99 ? amount : null
}

function cleanText(value?: string): string | null {
  const clean = value?.trim().slice(0, 80)
  return clean || null
}

export function parseCatalogFilters(params: CatalogSearchParams): CatalogFilterParams {
  const priceMin = parsePrice(params.price_min)
  const priceMax = parsePrice(params.price_max)
  return {
    priceMin: priceMin !== null && priceMax !== null && priceMin > priceMax ? priceMax : priceMin,
    priceMax: priceMin !== null && priceMax !== null && priceMin > priceMax ? priceMin : priceMax,
    processor: cleanText(params.processor), ram: cleanText(params.ram), storage: cleanText(params.storage),
    gpu: cleanText(params.gpu), display: cleanText(params.display),
    inStock: params.stock === 'in' ? true : params.stock === 'out' ? false : null,
  }
}

export function clampCatalogPage(requested: number, total: number, pageSize: number): { page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  const page = Number.isFinite(requested) ? Math.min(pageCount, Math.max(1, Math.trunc(requested))) : 1
  return { page, pageCount }
}
