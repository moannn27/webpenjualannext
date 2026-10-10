export function normalizeCompareIds(raw?: string): string[] {
  const ids = (raw ?? '').split(',').filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
  return [...new Set(ids)].slice(0, 3)
}

export function toggleCompareId(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((item) => item !== id)
  if (ids.length >= 3) return [...ids]
  return [...ids, id]
}
