export const LAPTOP_COMPARE_KEYS = ['Processor', 'RAM', 'Storage', 'GPU', 'Display', 'OS', 'Warranty'] as const
export type LaptopCompareKey = typeof LAPTOP_COMPARE_KEYS[number]

const aliases: Record<string, LaptopCompareKey> = {
  processor: 'Processor', cpu: 'Processor', procesor: 'Processor', processorname: 'Processor', processormodel: 'Processor', processortype: 'Processor', cpumodel: 'Processor', chipset: 'Processor',
  ram: 'RAM', memory: 'RAM', memorysize: 'RAM', systemmemory: 'RAM',
  storage: 'Storage', penyimpanan: 'Storage', harddrive: 'Storage', disk: 'Storage', ssd: 'Storage', storagecapacity: 'Storage',
  gpu: 'GPU', graphics: 'GPU', vga: 'GPU', videocard: 'GPU', graphiccard: 'GPU', graphicscard: 'GPU', graphicprocessor: 'GPU', graphicchip: 'GPU', gpumodel: 'GPU', discretegraphics: 'GPU',
  display: 'Display', screen: 'Display', layar: 'Display', displaysize: 'Display', displaysizeinch: 'Display', displayinch: 'Display', screensize: 'Display', screendiagonal: 'Display', panelsize: 'Display',
  os: 'OS', operatingsystem: 'OS', systemsoftware: 'OS',
  warranty: 'Warranty', warrantyperiod: 'Warranty', garansi: 'Warranty',
}

export function normalizeLaptopSpecKey(key: string): LaptopCompareKey | null {
  const normalized = key.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return aliases[normalized] ?? null
}

export type SpecificationEntry = { id?: string; key: string; value: string; display_order?: number }
export type LaptopSpecifications = Record<LaptopCompareKey, string | null>

export function collectLaptopSpecifications(entries: readonly SpecificationEntry[] = []): LaptopSpecifications {
  const result: LaptopSpecifications = { Processor: null, RAM: null, Storage: null, GPU: null, Display: null, OS: null, Warranty: null }
  for (const entry of entries) {
    const key = normalizeLaptopSpecKey(entry.key)
    const value = entry.value.trim()
    if (key && value && result[key] === null) result[key] = value
  }
  return result
}

export function compareValuesDiffer(values: readonly (string | number | null | undefined)[]): boolean {
  return new Set(values.map((value) => value == null || String(value).trim() === '' ? null : String(value).trim().toLocaleLowerCase('id-ID'))).size > 1
}

export function isBlacklistedSpecKey(key: string): boolean {
  if (!key) return true
  const lower = key.trim().toLowerCase()
  return /^(spesifikasi\s*sumber\s*pricelist|sumber\s*pricelist|model\s*code(\/type)?|kode\s*model|mtm(\/pn)?|pn|part\s*number|warna|color|sku)$/i.test(lower)
}

export function parseSpecsFromRawString(text: string): SpecificationEntry[] {
  if (!text || typeof text !== 'string') return []
  const result: SpecificationEntry[] = []
  
  // Split on slashes "/", newlines, semicolons, or pipes "|"
  const parts = text.split(/\s*[\/\n;|]\s*/).map((p) => p.trim()).filter(Boolean)
  
  for (const part of parts) {
    // Check if part is key: value
    const kvMatch = part.match(/^([^:=]{2,30})\s*[:=]\s*(.+)$/)
    if (kvMatch) {
      const k = kvMatch[1].trim()
      const v = kvMatch[2].trim()
      if (!isBlacklistedSpecKey(k) && v) {
        const norm = normalizeLaptopSpecKey(k)
        result.push({ key: norm ?? k, value: v })
        continue
      }
    }
    
    // Otherwise detect by content keywords:
    // 1. Display
    if (/\b(\d{1,2}(?:\.\d+)?\s*(?:["”]|inch|-inch)|wuxga|fhd|uhd|wqhd|oled|ips|touch\s*screen|\d{3,4}\s*x\s*\d{3,4})\b/i.test(part)) {
      if (!result.some((r) => r.key === 'Display')) {
        result.push({ key: 'Display', value: part })
        continue
      }
    }
    
    // 2. Processor
    if (/\b(intel|amd|ryzen|core\s+(?:ultra\s+)?[i\d]\w*|i[3579]-?\w+|celeron|pentium|snapdragon|apple\s+m\d|athlon)\b/i.test(part)) {
      if (!result.some((r) => r.key === 'Processor')) {
        result.push({ key: 'Processor', value: part })
        continue
      }
    }
    
    // 3. RAM
    if (/\b(\d+\s*gb|\d+\s*x\s*\d+\s*gb)\s*(ddr[345]|sodimm|so-dimm|lpddr|ram|memory)?\b/i.test(part) && !/\bssd|nvme|hdd\b/i.test(part)) {
      if (!result.some((r) => r.key === 'RAM')) {
        result.push({ key: 'RAM', value: part })
        continue
      }
    }
    
    // 4. Storage
    if (/\b(\d+\s*(?:gb|tb))\s*(m\.2|ssd|nvme|pcie|hdd|emmc|storage)\b/i.test(part) || /\b(m\.2\s+nvme|pcie\s+\d\.\d\s+ssd)\b/i.test(part)) {
      if (!result.some((r) => r.key === 'Storage')) {
        result.push({ key: 'Storage', value: part })
        continue
      }
    }
    
    // 5. OS
    if (/\b(windows\s*1[01]|win\s*1[01]|macos|ubuntu|linux|chrome\s*os|dos|freedos|oh\d{4}|m365)\b/i.test(part)) {
      if (!result.some((r) => r.key === 'OS')) {
        result.push({ key: 'OS', value: part })
        continue
      }
    }
    
    // 6. Warranty
    if (/\b(\d+\s*y(ear)?s?|\d+\s*tahun|garansi|premium\s*care|adp|oss|carry-in|onsite|garansi\s*resmi)\b/i.test(part)) {
      if (!result.some((r) => r.key === 'Warranty')) {
        result.push({ key: 'Warranty', value: part })
        continue
      }
    }

    // 7. GPU / Graphics
    if (/\b(rtx\s*\d{3,4}|gtx\s*\d{3,4}|geforce|radeon|intel\s+iris|uhd\s+graphics|arc\s+a\d{3})\b/i.test(part)) {
      if (!result.some((r) => r.key === 'GPU')) {
        result.push({ key: 'GPU', value: part })
        continue
      }
    }
  }
  
  return result
}

export function getCleanProductSpecifications(
  rawSpecs: readonly SpecificationEntry[] = [],
  variant?: { ram?: string | null; storage?: string | null; color?: string | null } | null,
  rawDescription?: string | null
): SpecificationEntry[] {
  const specMap = new Map<string, string>()

  // 1. Process explicit non-blacklisted specs
  for (const s of rawSpecs) {
    if (!s || !s.key || !s.value) continue
    if (isBlacklistedSpecKey(s.key)) {
      // If it's the raw pricelist string, parse it to extract any missing specs
      if (/sumber\s*pricelist/i.test(s.key)) {
        const extracted = parseSpecsFromRawString(s.value)
        for (const ext of extracted) {
          if (!specMap.has(ext.key)) {
            specMap.set(ext.key, ext.value)
          }
        }
      }
      continue
    }

    const normalizedKey = normalizeLaptopSpecKey(s.key) ?? s.key.trim()
    if (!specMap.has(normalizedKey)) {
      specMap.set(normalizedKey, s.value.trim())
    }
  }

  // 2. If description has raw text and specs are still missing Processor or Display, try parsing description
  if ((!specMap.has('Processor') || !specMap.has('Display')) && rawDescription) {
    const fromDesc = parseSpecsFromRawString(rawDescription)
    for (const ext of fromDesc) {
      if (!specMap.has(ext.key)) {
        specMap.set(ext.key, ext.value)
      }
    }
  }

  // 3. Variant overrides for RAM / Storage
  if (variant?.ram && variant.ram.trim()) {
    specMap.set('RAM', variant.ram.trim())
  }
  if (variant?.storage && variant.storage.trim()) {
    specMap.set('Storage', variant.storage.trim())
  }

  // 4. Build sorted clean entries: Priority order matching SS 2:
  // Processor -> RAM -> Storage -> Display -> GPU -> OS -> Warranty -> Others
  const priorityKeys: string[] = ['Processor', 'RAM', 'Storage', 'Display', 'GPU', 'OS', 'Warranty']
  const sorted: SpecificationEntry[] = []

  for (const key of priorityKeys) {
    if (specMap.has(key)) {
      sorted.push({ key, value: specMap.get(key)! })
      specMap.delete(key)
    }
  }

  // Append remaining valid specs
  for (const [key, value] of specMap.entries()) {
    sorted.push({ key, value })
  }

  return sorted
}
