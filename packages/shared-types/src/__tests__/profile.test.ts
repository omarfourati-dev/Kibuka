import { describe, it, expect } from 'vitest';
import type { ChildProfile, ReadingProgress, ReadingStats } from '../profile';

describe('Profile types', () => {
  it('ChildProfile has required fields', () => {
    const profile: ChildProfile = {
      id: 'cp1',
      userId: 'u1',
      name: 'Emma',
      age: 6,
      preferredLanguages: ['de', 'ar'],
      avatarEmoji: '🧒',
      createdAt: '2026-05-09T00:00:00Z',
    };
    expect(profile.age).toBeGreaterThanOrEqual(1);
    expect(profile.preferredLanguages).toContain('de');
  });

  it('ReadingProgress tracks page and completion', () => {
    const progress: ReadingProgress = {
      id: 'rp1',
      childProfileId: 'cp1',
      bookId: 'b1',
      currentPage: 5,
      completedAt: null,
      lastReadAt: '2026-05-09T20:00:00Z',
    };
    expect(progress.completedAt).toBeNull();
    expect(progress.currentPage).toBe(5);
  });

  it('ReadingProgress can have a completedAt date', () => {
    const progress: ReadingProgress = {
      id: 'rp2',
      childProfileId: 'cp1',
      bookId: 'b2',
      currentPage: 10,
      completedAt: '2026-05-09T21:00:00Z',
      lastReadAt: '2026-05-09T21:00:00Z',
    };
    expect(progress.completedAt).toBe('2026-05-09T21:00:00Z');
  });

  it('ReadingStats has all analytics fields', () => {
    const stats: ReadingStats = {
      childProfileId: 'cp1',
      totalBooksRead: 5,
      totalPagesRead: 50,
      currentStreak: 3,
      longestStreak: 7,
      favoriteLanguage: 'de',
      favoriteTheme: 'animals',
    };
    expect(stats.totalBooksRead).toBe(5);
    expect(stats.currentStreak).toBeLessThanOrEqual(stats.longestStreak);
  });

  it('ReadingStats allows null for favorite language and theme', () => {
    const stats: ReadingStats = {
      childProfileId: 'cp1',
      totalBooksRead: 0,
      totalPagesRead: 0,
      currentStreak: 0,
      longestStreak: 0,
      favoriteLanguage: null,
      favoriteTheme: null,
    };
    expect(stats.favoriteLanguage).toBeNull();
    expect(stats.favoriteTheme).toBeNull();
  });
});
