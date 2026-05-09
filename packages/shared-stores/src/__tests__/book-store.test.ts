import { describe, it, expect, beforeEach } from "vitest";
import { useBookStore } from "../book-store";

describe("useBookStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useBookStore.setState({
      dailyBook: null,
      library: [],
      totalBooks: 0,
      currentFilter: {},
      purchasedBookIds: new Set(),
      isLoading: false,
      error: null,
    });
  });

  it("starts with empty state", () => {
    const state = useBookStore.getState();
    expect(state.dailyBook).toBeNull();
    expect(state.library).toHaveLength(0);
    expect(state.isLoading).toBe(false);
  });

  it("setDailyBook updates daily book", () => {
    const book = {
      id: "b1",
      theme: "animals",
      ageRange: "3-5",
      coverImageUrl: "",
      isDailyBook: true,
      publishedAt: "2026-05-09T00:00:00Z",
      pageCount: 10,
      priceSingle: 1.99,
      titles: { de: "Test", ar: "تست", fr: "Test", en: "Test" },
    } as any;
    useBookStore.getState().setDailyBook(book);
    expect(useBookStore.getState().dailyBook?.id).toBe("b1");
  });

  it("setLibrary stores books and total", () => {
    const books = [{ id: "b1" }, { id: "b2" }] as any[];
    useBookStore.getState().setLibrary(books, 50);
    const state = useBookStore.getState();
    expect(state.library).toHaveLength(2);
    expect(state.totalBooks).toBe(50);
  });

  it("setFilter merges with existing filter", () => {
    useBookStore.getState().setFilter({ language: "de" });
    useBookStore.getState().setFilter({ ageRange: "3-5" });
    const filter = useBookStore.getState().currentFilter;
    expect(filter.language).toBe("de");
    expect(filter.ageRange).toBe("3-5");
  });

  it("resetFilter clears all filters", () => {
    useBookStore.getState().setFilter({ language: "de", ageRange: "3-5" });
    useBookStore.getState().resetFilter();
    expect(useBookStore.getState().currentFilter).toEqual({});
  });

  it("addPurchasedBook adds to set", () => {
    useBookStore.getState().addPurchasedBook("b1");
    useBookStore.getState().addPurchasedBook("b2");
    expect(useBookStore.getState().purchasedBookIds.has("b1")).toBe(true);
    expect(useBookStore.getState().purchasedBookIds.has("b2")).toBe(true);
  });
});
