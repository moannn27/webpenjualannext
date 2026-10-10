import { create } from 'zustand'
import { toggleCompareId } from '@/lib/product-compare'

type ProductCompareState = { ids: string[]; toggle: (id: string) => void; clear: () => void }

export const useProductCompareStore = create<ProductCompareState>((set) => ({
  ids: [],
  toggle: (id) => set((state) => ({ ids: toggleCompareId(state.ids, id) })),
  clear: () => set({ ids: [] }),
}))
