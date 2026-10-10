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

export type SpecificationEntry = { key: string; value: string }
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
