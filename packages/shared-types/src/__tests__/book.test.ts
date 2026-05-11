import { describe, it, expect } from 'vitest';
import type { Book, BookSummary, Language, AgeRange, BookTheme, WordTimestamp, BookFilter, BookPage, BookTranslation } from '../book';

describe('Book types', () => {
  it('Book type has all required fields', () => {
    const book: Book = {
      id: '123',
      theme: 'animals',
      ageRange: '3-5',
      coverImageUrl: 'https://example.com/cover.jpg',
      isDailyBook: true,
      publishedAt: '2026-05-09T06:00:00Z',
      pageCount: 10,
      priceSingle: 1.99,
      translations: {
        de: { language: 'de', title: 'Der kleine Löwe', pages: [] },
        ar: { language: 'ar', title: 'الأسد الصغير', pages: [] },
        fr: { language: 'fr', title: 'Le petit lion', pages: [] },
        en: { language: 'en', title: 'The little lion', pages: [] },
      },
    };
    expect(book.id).toBe('123');
    expect(book.priceSingle).toBe(1.99);
    expect(Object.keys(book.translations)).toHaveLength(4);
  });

  it('WordTimestamp has word and timing', () => {
    const ts: WordTimestamp = { word: 'Hallo', startTime: 0, endTime: 500 };
    expect(ts.startTime).toBeLessThan(ts.endTime);
  });

  it('Language type only allows valid values', () => {
    const langs: Language[] = ['de', 'ar', 'fr', 'en'];
    expect(langs).toHaveLength(4);
  });

  it('BookFilter defaults to no filters', () => {
    const filter: BookFilter = {};
    expect(filter).toBeDefined();
  });

  it('BookPage has pageNumber, text, audio and timestamps', () => {
    const page: BookPage = {
      pageNumber: 1,
      text: 'Es war einmal...',
      illustrationUrl: 'https://example.com/page1.jpg',
      audioUrl: 'https://example.com/page1.mp3',
      wordTimestamps: [{ word: 'Es', startTime: 0, endTime: 200 }],
    };
    expect(page.pageNumber).toBe(1);
    expect(page.wordTimestamps).toHaveLength(1);
  });

  it('BookSummary has titles record without pages', () => {
    const summary: BookSummary = {
      id: 'b1',
      theme: 'adventure',
      ageRange: '5-8',
      coverImageUrl: 'https://example.com/cover.jpg',
      isDailyBook: false,
      publishedAt: '2026-05-09T00:00:00Z',
      pageCount: 12,
      priceSingle: 1.99,
      titles: {
        de: 'Das Abenteuer',
        ar: 'المغامرة',
        fr: "L'aventure",
        en: 'The adventure',
      },
    };
    expect(summary.titles['de']).toBe('Das Abenteuer');
    expect((summary as unknown as { pages: unknown }).pages).toBeUndefined();
  });

  it('AgeRange type covers all valid ranges', () => {
    const ranges: AgeRange[] = ['3-5', '5-8', '8-10'];
    expect(ranges).toHaveLength(3);
  });

  it('BookTheme type covers all valid themes', () => {
    const themes: BookTheme[] = ['animals', 'adventure', 'friendship', 'nature', 'culture', 'values'];
    expect(themes).toHaveLength(6);
  });
});
