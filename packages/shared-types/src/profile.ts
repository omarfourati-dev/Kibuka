import type { Language } from './book';

export interface ChildProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  preferredLanguages: Language[];
  avatarEmoji: string;
  createdAt: string;
}

export interface ReadingProgress {
  id: string;
  childProfileId: string;
  bookId: string;
  currentPage: number;
  completedAt: string | null;
  lastReadAt: string;
}

export interface ReadingStats {
  childProfileId: string;
  totalBooksRead: number;
  totalPagesRead: number;
  currentStreak: number;
  longestStreak: number;
  favoriteLanguage: Language | null;
  favoriteTheme: string | null;
}
