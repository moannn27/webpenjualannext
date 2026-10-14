import { normalizeLaptopSpecKey } from './product-specifications'

export type ProductCandidate = {
  id: string
  name: string
  sku?: string | null
  description?: string | null
  price: number | string
  discount_price?: number | string | null
  stock?: number | null
  status?: string | null
  is_best_seller?: boolean | null
  is_new_arrival?: boolean | null
  category_id?: string | null
  brand_id?: string | null
  categories?: { id?: string; name: string } | null
  brands?: { id?: string; name: string } | null
  product_specifications?: { id?: string; key: string; value: string; display_order?: number }[] | null
  product_images?: { url: string; is_primary: boolean }[] | null
}

export type ProductSegment =
  | 'gaming'
  | 'slim_ultrabook'
  | 'aio_desktop'
  | 'tablet_2in1'
  | 'smartphone'
  | 'accessory'
  | 'general'

export type ProcessorTier = 'entry' | 'mid' | 'high' | 'flagship' | null

export type GpuInfo = {
  isDedicated: boolean
  gpuFamily: string | null
}

function normalizeText(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Mendeteksi segmen produk (gaming, slim ultrabook, AIO desktop, tablet 2in1, dll)
 * berdasarkan nama, deskripsi, kategori, dan spesifikasi hardware.
 */
export function detectProductSegment(product: ProductCandidate): ProductSegment {
  const catName = normalizeText(product.categories?.name)
  const name = normalizeText(product.name)
  const desc = normalizeText(product.description)
  const specs = (product.product_specifications ?? []).map((s) => `${normalizeText(s.key)} ${normalizeText(s.value)}`).join(' ')
  const combined = `${catName} ${name} ${desc} ${specs}`

  // 1. All-in-One / Desktop
  if (
    catName.includes('all-in-one') ||
    catName.includes('desktop') ||
    catName.includes('aio') ||
    /\b(aio|all-in-one|all in one|ideacentre|tower|pc desktop)\b/i.test(name)
  ) {
    return 'aio_desktop'
  }

  // 2. Gaming (khusus laptop gaming / produk grafis tinggi)
  const hasGamingKeyword = /\b(gaming|loq|legion|rog|tuf|nitro|predator|victus|omen|alienware|blade|strix|zephyrus)\b/i.test(name) ||
    catName.includes('gaming') ||
    /\b(gaming laptop|laptop gaming)\b/i.test(combined)

  const hasDedicatedGpuInSpecs = (product.product_specifications ?? []).some((s) => {
    const key = normalizeLaptopSpecKey(s.key)
    if (key === 'GPU') {
      const val = normalizeText(s.value)
      return /\b(rtx|gtx|geforce|radeon rx|arc a\d{3}|discrete)\b/i.test(val) && !val.includes('integrated')
    }
    return false
  })

  const hasDedicatedGpuInText = /\b(rtx\s*\d{4}|gtx\s*\d{4}|geforce rtx|geforce gtx|radeon rx\s*\d{4})\b/i.test(combined)

  if (hasGamingKeyword || (hasDedicatedGpuInSpecs && !catName.includes('desktop')) || (hasDedicatedGpuInText && !catName.includes('desktop'))) {
    return 'gaming'
  }

  // 3. Tablet & 2-in-1
  if (
    catName.includes('tablet') ||
    /\b(tab|tablet|2-in-1|2 in 1|x360|yoga 7 2-in-1|yoga 9 2-in-1|ideapad 5 2-in-1|flip|fold|ipad)\b/i.test(name)
  ) {
    return 'tablet_2in1'
  }

  // 4. Smartphone
  if (
    catName.includes('smartphone') ||
    catName.includes('handphone') ||
    catName.includes('hp') ||
    /\b(smartphone|handphone|galaxy s\d|galaxy a\d|galaxy z|iphone|redmi|poco|infinix)\b/i.test(name)
  ) {
    return 'smartphone'
  }

  // 5. Aksesoris
  if (
    catName.includes('aksesoris') ||
    catName.includes('accessory') ||
    /\b(mouse|keyboard|headset|earphone|charger|adapter|kabel|cable|backpack|tas|sleeve|mousepad)\b/i.test(name)
  ) {
    return 'accessory'
  }

  // 6. Slim / Ultrabook / Thin & Light Laptop
  if (
    catName.includes('laptop') ||
    catName.includes('notebook') ||
    /\b(slim|yoga|ideapad|thinkpad|zenbook|vivobook|swift|gram|macbook|air|ultrabook|elitebook|latitude)\b/i.test(combined)
  ) {
    return 'slim_ultrabook'
  }

  return 'general'
}

/**
 * Ekstraksi informasi GPU dari spesifikasi dan teks produk
 */
export function extractGpuInfo(product: ProductCandidate): GpuInfo {
  let gpuVal = ''
  for (const spec of product.product_specifications ?? []) {
    if (normalizeLaptopSpecKey(spec.key) === 'GPU') {
      gpuVal = normalizeText(spec.value)
      break
    }
  }

  const combined = `${gpuVal} ${normalizeText(product.name)} ${normalizeText(product.description)}`

  // Cek dedicated GPU
  if (/\brtx\s*40\d{2}\b/i.test(combined)) return { isDedicated: true, gpuFamily: 'rtx40' }
  if (/\brtx\s*30\d{2}\b/i.test(combined)) return { isDedicated: true, gpuFamily: 'rtx30' }
  if (/\brtx\s*20\d{2}\b/i.test(combined)) return { isDedicated: true, gpuFamily: 'rtx20' }
  if (/\bgtx\b/i.test(combined)) return { isDedicated: true, gpuFamily: 'gtx' }
  if (/\brtx\b/i.test(combined)) return { isDedicated: true, gpuFamily: 'rtx' }
  if (/\bradeon\s*rx\b/i.test(combined)) return { isDedicated: true, gpuFamily: 'radeon_rx' }
  if (/\barc\s*a\d{3}\b/i.test(combined)) return { isDedicated: true, gpuFamily: 'intel_arc' }

  const isExplicitIntegrated = /\b(integrated|intel iris|intel uhd|intel graphics|radeon graphics|shared)\b/i.test(combined)
  return { isDedicated: false, gpuFamily: isExplicitIntegrated ? 'integrated' : null }
}

/**
 * Ekstraksi tingkatan (tier) prosesor dari produk
 */
export function extractProcessorTier(product: ProductCandidate): ProcessorTier {
  let procVal = ''
  for (const spec of product.product_specifications ?? []) {
    if (normalizeLaptopSpecKey(spec.key) === 'Processor') {
      procVal = normalizeText(spec.value)
      break
    }
  }

  const combined = `${procVal} ${normalizeText(product.name)}`

  if (/\b(i9|core 9|ultra 9|ryzen 9|m\d\s*max)\b/i.test(combined)) return 'flagship'
  if (/\b(i7|core 7|ultra 7|ryzen 7|m\d\s*pro)\b/i.test(combined)) return 'high'
  if (/\b(i5|core 5|ultra 5|ryzen 5|m[1-4]\b)\b/i.test(combined)) return 'mid'
  if (/\b(i3|core 3|ryzen 3|n100|n200|n305|celeron|pentium)\b/i.test(combined)) return 'entry'

  return null
}

/**
 * Hitung skor kesamaan / relevansi antara produk target dengan produk kandidat.
 * Semakin tinggi skor, semakin cocok dan saling terikat kedua produk.
 */
export function calculateProductSimilarity(target: ProductCandidate, candidate: ProductCandidate): number {
  if (target.id === candidate.id) return -999

  let score = 0

  const targetCategory = normalizeText(target.categories?.name)
  const candCategory = normalizeText(candidate.categories?.name)

  const targetSegment = detectProductSegment(target)
  const candSegment = detectProductSegment(candidate)

  // 1. Kategori & Segmen Utama
  const isSameCategory = (target.category_id && target.category_id === candidate.category_id) ||
    (targetCategory && targetCategory === candCategory)

  if (isSameCategory) {
    score += 40
  } else {
    // Kategori berkerabat dekat (misal Gaming Laptops vs Laptops biasa)
    const isBothLaptop = (targetCategory.includes('laptop') || targetSegment === 'gaming' || targetSegment === 'slim_ultrabook') &&
      (candCategory.includes('laptop') || candSegment === 'gaming' || candSegment === 'slim_ultrabook')

    if (isBothLaptop) {
      score += 25
    } else if (
      (targetSegment === 'aio_desktop' && candSegment !== 'aio_desktop') ||
      (targetSegment !== 'aio_desktop' && candSegment === 'aio_desktop') ||
      (targetSegment === 'smartphone' && candSegment !== 'smartphone') ||
      (targetSegment !== 'smartphone' && candSegment === 'smartphone') ||
      (targetSegment === 'accessory' && candSegment !== 'accessory')
    ) {
      // Penalti perbedaan jenis perangkat fundamental (jangan tawarkan mouse/hp jika sedang melihat laptop)
      score -= 60
    }
  }

  // 2. Segmen Kesamaan (Gaming vs Gaming, Slim vs Slim, dsb)
  if (targetSegment === candSegment && targetSegment !== 'general') {
    score += 45
  } else if (targetSegment === 'gaming' && candSegment !== 'gaming') {
    // Jika melihat laptop gaming tapi disarankan laptop kantor non-gaming: penalti
    score -= 30
  } else if (targetSegment === 'slim_ultrabook' && candSegment === 'gaming') {
    // Jika melihat laptop tipis tapi disarankan laptop gaming tebal: penalti
    score -= 20
  }

  // 3. GPU / Graphics Card Compatibility
  const targetGpu = extractGpuInfo(target)
  const candGpu = extractGpuInfo(candidate)

  if (targetGpu.isDedicated && candGpu.isDedicated) {
    score += 35
    if (targetGpu.gpuFamily && candGpu.gpuFamily && targetGpu.gpuFamily === candGpu.gpuFamily) {
      score += 20 // Sama-sama seri RTX 40 misalnya
    }
  } else if (targetGpu.isDedicated && !candGpu.isDedicated && targetSegment === 'gaming') {
    score -= 25
  } else if (!targetGpu.isDedicated && !candGpu.isDedicated && targetGpu.gpuFamily === 'integrated' && candGpu.gpuFamily === 'integrated') {
    score += 15
  }

  // 4. Processor Tier Similarity
  const targetProc = extractProcessorTier(target)
  const candProc = extractProcessorTier(candidate)

  if (targetProc && candProc) {
    if (targetProc === candProc) {
      score += 20 // Misal sama-sama level Core i5 / Ryzen 5
    } else {
      const tierOrder: Record<string, number> = { entry: 1, mid: 2, high: 3, flagship: 4 }
      const diff = Math.abs((tierOrder[targetProc] ?? 0) - (tierOrder[candProc] ?? 0))
      if (diff === 1) {
        score += 10 // Tier bersebelahan (i5 vs i7)
      } else {
        score -= 10
      }
    }
  }

  // 5. Rentang Harga (Budget Proximity)
  const targetPrice = Number(target.discount_price ?? target.price)
  const candPrice = Number(candidate.discount_price ?? candidate.price)

  if (targetPrice > 0 && candPrice > 0) {
    const diffRatio = Math.abs(candPrice - targetPrice) / targetPrice
    if (diffRatio <= 0.20) {
      // Dalam rentang ±20% dari harga target
      score += 30
    } else if (diffRatio <= 0.35) {
      // Dalam rentang ±35%
      score += 20
    } else if (diffRatio <= 0.50) {
      // Dalam rentang ±50%
      score += 10
    } else if (diffRatio > 1.8) {
      // Terlalu jauh (misal 3x lipat lebih mahal / murah)
      score -= 30
    }
  }

  // 6. Brand Synergy
  const targetBrand = normalizeText(target.brands?.name)
  const candBrand = normalizeText(candidate.brands?.name)
  if (targetBrand && candBrand && targetBrand === candBrand) {
    score += 15 // Merek sama memberikan poin tambah
  }

  // 7. Ketersediaan Stok & Status
  if (Number(candidate.stock ?? 0) > 0) {
    score += 15
  }
  if (candidate.is_best_seller) {
    score += 10
  }
  if (candidate.is_new_arrival) {
    score += 5
  }

  return score
}

/**
 * Filter, skor, dan urutkan produk kandidat berdasarkan keterikatan dengan target produk.
 * Selalu mengembalikan maksimal sejumlah `limit`.
 * Jika produk yang relevan kurang dari limit, akan dilengkapi dengan produk sejenis dari katalog.
 */
export function rankRelatedProducts(
  target: ProductCandidate,
  allCandidates: ProductCandidate[],
  limit = 8
): ProductCandidate[] {
  if (!allCandidates || allCandidates.length === 0) return []

  const eligibleCandidates = allCandidates.filter((item) => item.id !== target.id)
  if (eligibleCandidates.length === 0) return []

  // Hitung skor untuk setiap kandidat
  const scored = eligibleCandidates.map((candidate) => ({
    candidate,
    score: calculateProductSimilarity(target, candidate),
  }))

  // Urutkan berdasarkan skor descending
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Secondary sort: ready stock first, then newest
    const stockA = Number(a.candidate.stock ?? 0) > 0 ? 1 : 0
    const stockB = Number(b.candidate.stock ?? 0) > 0 ? 1 : 0
    return stockB - stockA
  })

  // Ambil kandidat dengan skor positif terlebih dahulu
  const positiveMatches = scored
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.candidate)

  const selectedIds = new Set(positiveMatches.map((p) => p.id))
  const results = [...positiveMatches.slice(0, limit)]

  // Jika hasil masih kurang dari limit, backfill dari kandidat yang tersisa
  if (results.length < limit) {
    for (const entry of scored) {
      if (results.length >= limit) break
      if (!selectedIds.has(entry.candidate.id)) {
        selectedIds.add(entry.candidate.id)
        results.push(entry.candidate)
      }
    }
  }

  return results
}

/**
 * Buat subtitle rekomendasi yang kontekstual berdasarkan segmen produk target.
 */
export function getRecommendationSubtitle(product: ProductCandidate): string {
  const segment = detectProductSegment(product)
  switch (segment) {
    case 'gaming':
      return 'Pilihan laptop gaming dan perangkat berperforma grafis tinggi lainnya yang mungkin kamu suka.'
    case 'slim_ultrabook':
      return 'Pilihan laptop tipis, ringan, dan produktivitas serupa dengan spesifikasi sekelas.'
    case 'aio_desktop':
      return 'Pilihan All-in-One PC dan komputer desktop serupa untuk kenyamanan ruang kerjamu.'
    case 'tablet_2in1':
      return 'Pilihan tablet dan laptop 2-in-1 fleksibel lainnya yang sesuai untuk mobilitasmu.'
    case 'smartphone':
      return 'Pilihan smartphone dan perangkat komunikasi serupa dalam rentang kelas yang setara.'
    default:
      return 'Rekomendasi perangkat serupa pilihan yang mungkin cocok dengan kebutuhanmu.'
  }
}

