import { createStore } from "zustand/vanilla";
import type { Book, Language } from "@omarsapp/shared-types";

export interface ReaderState {
  currentBook: Book | null;
  currentPage: number;
  selectedLanguage: Language;
  secondLanguage: Language | null;
  isPlaying: boolean;
  currentTime: number;
  playbackSpeed: number;
  isDualLanguageMode: boolean;
  isFullscreen: boolean;

  setBook: (book: Book) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setLanguage: (language: Language) => void;
  setSecondLanguage: (language: Language | null) => void;
  toggleDualLanguage: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleFullscreen: () => void;
  reset: () => void;
}

const defaultState: Pick<
  ReaderState,
  | "currentBook"
  | "currentPage"
  | "selectedLanguage"
  | "secondLanguage"
  | "isPlaying"
  | "currentTime"
  | "playbackSpeed"
  | "isDualLanguageMode"
  | "isFullscreen"
> = {
  currentBook: null,
  currentPage: 0,
  selectedLanguage: "de",
  secondLanguage: null,
  isPlaying: false,
  currentTime: 0,
  playbackSpeed: 1.0,
  isDualLanguageMode: false,
  isFullscreen: false,
};

export const useReaderStore = createStore<ReaderState>()((set, get) => ({
  ...defaultState,

  setBook: (book) => set({ currentBook: book, currentPage: 0 }),
  setPage: (page) => set({ currentPage: page }),
  nextPage: () => {
    const { currentBook, currentPage, selectedLanguage } = get();
    if (!currentBook) return;
    const translation = currentBook.translations[selectedLanguage];
    const pageCount =
      translation && translation.pages.length > 0
        ? translation.pages.length
        : currentBook.pageCount;
    const maxPage = pageCount - 1;
    if (currentPage < maxPage) {
      set({ currentPage: currentPage + 1 });
    }
  },
  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 0) {
      set({ currentPage: currentPage - 1 });
    }
  },
  setLanguage: (language) => set({ selectedLanguage: language }),
  setSecondLanguage: (language) => set({ secondLanguage: language }),
  toggleDualLanguage: () =>
    set((state) => ({ isDualLanguageMode: !state.isDualLanguageMode })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  toggleFullscreen: () =>
    set((state) => ({ isFullscreen: !state.isFullscreen })),
  reset: () => set({ ...defaultState }),
}));
