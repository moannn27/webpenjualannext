import { create } from "zustand";

interface QuickSearchState {
  isOpen: boolean;
  query: string;
  openSearch: (initialQuery?: string) => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
}

export const useQuickSearchStore = create<QuickSearchState>((set) => ({
  isOpen: false,
  query: "",
  openSearch: (initialQuery = "") => set({ isOpen: true, query: initialQuery }),
  closeSearch: () => set({ isOpen: false, query: "" }),
  setQuery: (query: string) => set({ query }),
}));

export const openQuickSearch = (initialQuery = "") => {
  useQuickSearchStore.getState().openSearch(initialQuery);
};

export const closeQuickSearch = () => {
  useQuickSearchStore.getState().closeSearch();
};

