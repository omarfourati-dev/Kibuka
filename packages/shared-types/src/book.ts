export type Language = 'de' | 'ar' | 'fr' | 'en';
export type AgeRange = '3-5' | '5-8' | '8-10';
export type BookTheme = 'animals' | 'adventure' | 'friendship' | 'nature' | 'culture' | 'values';

export interface WordTimestamp {
  word: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
}

export interface BookPage {
  pageNumber: number;
  text: string;
  illustrationUrl: string;
  audioUrl: string;
  wordTimestamps: WordTimestamp[];
}

export interface BookTranslation {
  language: Language;
  title: string;
  pages: BookPage[];
}

export interface Book {
  id: string;
  theme: BookTheme;
  ageRange: AgeRange;
  coverImageUrl: string;
  isDailyBook: boolean;
  publishedAt: string; // ISO 8601
  pageCount: number;
  priceSingle: number; // e.g. 1.99
  translations: Record<Language, BookTranslation>;
}

export interface BookSummary {
  id: string;
  theme: BookTheme;
  ageRange: AgeRange;
  coverImageUrl: string;
  isDailyBook: boolean;
  publishedAt: string;
  pageCount: number;
  priceSingle: number;
  titles: Record<Language, string>; // just titles, no pages (for list views)
  isPurchased?: boolean;
}

export interface BookFilter {
  language?: Language;
  ageRange?: AgeRange;
  theme?: BookTheme;
  purchasedOnly?: boolean;
  page?: number;
  pageSize?: number;
}
