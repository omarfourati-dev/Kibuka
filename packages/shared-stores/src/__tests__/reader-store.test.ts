import { describe, it, expect, beforeEach } from "vitest";
import { useReaderStore } from "../reader-store";

const mockBook = {
  id: "b1",
  theme: "animals",
  ageRange: "3-5",
  coverImageUrl: "",
  isDailyBook: false,
  publishedAt: "2026-05-09T00:00:00Z",
  pageCount: 5,
  priceSingle: 1.99,
  translations: {
    de: {
      language: "de",
      title: "Test",
      pages: [
        {
          pageNumber: 0,
          text: "Seite 1",
          illustrationUrl: "",
          audioUrl: "",
          wordTimestamps: [],
        },
        {
          pageNumber: 1,
          text: "Seite 2",
          illustrationUrl: "",
          audioUrl: "",
          wordTimestamps: [],
        },
        {
          pageNumber: 2,
          text: "Seite 3",
          illustrationUrl: "",
          audioUrl: "",
          wordTimestamps: [],
        },
      ],
    },
    ar: { language: "ar", title: "تست", pages: [] },
    fr: { language: "fr", title: "Test", pages: [] },
    en: { language: "en", title: "Test", pages: [] },
  },
} as any;

describe("useReaderStore", () => {
  beforeEach(() => {
    useReaderStore.getState().reset();
  });

  it("starts with default state", () => {
    const state = useReaderStore.getState();
    expect(state.currentBook).toBeNull();
    expect(state.currentPage).toBe(0);
    expect(state.selectedLanguage).toBe("de");
    expect(state.isPlaying).toBe(false);
    expect(state.playbackSpeed).toBe(1.0);
  });

  it("setBook loads a book", () => {
    useReaderStore.getState().setBook(mockBook);
    expect(useReaderStore.getState().currentBook?.id).toBe("b1");
    expect(useReaderStore.getState().currentPage).toBe(0);
  });

  it("nextPage increments page", () => {
    useReaderStore.getState().setBook(mockBook);
    useReaderStore.getState().nextPage();
    expect(useReaderStore.getState().currentPage).toBe(1);
  });

  it("nextPage does not exceed last page", () => {
    useReaderStore.getState().setBook(mockBook);
    useReaderStore.getState().setPage(2);
    useReaderStore.getState().nextPage();
    // pageCount is 3 pages (0,1,2) — should stay at 2
    expect(useReaderStore.getState().currentPage).toBe(2);
  });

  it("prevPage decrements page", () => {
    useReaderStore.getState().setBook(mockBook);
    useReaderStore.getState().setPage(2);
    useReaderStore.getState().prevPage();
    expect(useReaderStore.getState().currentPage).toBe(1);
  });

  it("prevPage does not go below 0", () => {
    useReaderStore.getState().setBook(mockBook);
    useReaderStore.getState().prevPage();
    expect(useReaderStore.getState().currentPage).toBe(0);
  });

  it("toggleDualLanguage flips isDualLanguageMode", () => {
    expect(useReaderStore.getState().isDualLanguageMode).toBe(false);
    useReaderStore.getState().toggleDualLanguage();
    expect(useReaderStore.getState().isDualLanguageMode).toBe(true);
  });

  it("reset clears state", () => {
    useReaderStore.getState().setBook(mockBook);
    useReaderStore.getState().setPage(2);
    useReaderStore.getState().setLanguage("ar");
    useReaderStore.getState().reset();
    const state = useReaderStore.getState();
    expect(state.currentBook).toBeNull();
    expect(state.currentPage).toBe(0);
    expect(state.selectedLanguage).toBe("de");
  });
});
