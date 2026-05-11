import { createStore } from "zustand/vanilla";
import type { BookSummary, BookFilter } from "@omarsapp/shared-types";

export interface BookState {
  dailyBook: BookSummary | null;
  library: BookSummary[];
  totalBooks: number;
  currentFilter: BookFilter;
  purchasedBookIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  setDailyBook: (book: BookSummary | null) => void;
  setLibrary: (books: BookSummary[], total: number) => void;
  setFilter: (filter: Partial<BookFilter>) => void;
  resetFilter: () => void;
  addPurchasedBook: (bookId: string) => void;
  setPurchasedBooks: (bookIds: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBookStore = createStore<BookState>()((set) => ({
  dailyBook: null,
  library: [],
  totalBooks: 0,
  currentFilter: {},
  purchasedBookIds: new Set(),
  isLoading: false,
  error: null,

  setDailyBook: (book) => set({ dailyBook: book }),
  setLibrary: (books, total) => set({ library: books, totalBooks: total }),
  setFilter: (filter) =>
    set((state) => ({ currentFilter: { ...state.currentFilter, ...filter } })),
  resetFilter: () => set({ currentFilter: {} }),
  addPurchasedBook: (bookId) =>
    set((state) => ({
      purchasedBookIds: new Set([...state.purchasedBookIds, bookId]),
    })),
  setPurchasedBooks: (bookIds) => set({ purchasedBookIds: new Set(bookIds) }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
