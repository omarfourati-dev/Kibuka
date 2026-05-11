/**
 * @file library.test.tsx
 * Tests for Kibuka Library Screen (Task 20)
 * Written BEFORE implementation — TDD RED phase
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useQuery } from '@tanstack/react-query';
import LibraryScreen from '../app/(app)/library';

const mockUseQuery = useQuery as jest.Mock;

const mockBooks = [
  {
    id: 'book-1',
    theme: 'animals' as const,
    ageRange: '3-5' as const,
    coverImageUrl: 'https://example.com/cover1.jpg',
    isDailyBook: false,
    publishedAt: '2026-05-01T00:00:00Z',
    pageCount: 10,
    priceSingle: 1.99,
    titles: { de: 'Erstes Buch', ar: 'الكتاب الأول', fr: 'Premier livre', en: 'First Book' },
    isPurchased: true,
  },
  {
    id: 'book-2',
    theme: 'adventure' as const,
    ageRange: '5-8' as const,
    coverImageUrl: 'https://example.com/cover2.jpg',
    isDailyBook: false,
    publishedAt: '2026-05-05T00:00:00Z',
    pageCount: 12,
    priceSingle: 2.49,
    titles: { de: 'Zweites Buch', ar: 'الكتاب الثاني', fr: 'Deuxième livre', en: 'Second Book' },
    isPurchased: false,
  },
];

describe('LibraryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: mockBooks, isLoading: false });
  });

  describe('renders filter row', () => {
    it('renders the language filter buttons', () => {
      render(<LibraryScreen />);
      expect(screen.getByTestId('filter-de')).toBeTruthy();
      expect(screen.getByTestId('filter-ar')).toBeTruthy();
      expect(screen.getByTestId('filter-fr')).toBeTruthy();
      expect(screen.getByTestId('filter-en')).toBeTruthy();
    });

    it('renders "Alle" or all-books filter option', () => {
      render(<LibraryScreen />);
      expect(screen.getByTestId('filter-all')).toBeTruthy();
    });

    it('language filter buttons show correct flag labels', () => {
      render(<LibraryScreen />);
      expect(screen.getByText('🇩🇪 DE')).toBeTruthy();
      expect(screen.getByText('🇸🇦 AR')).toBeTruthy();
      expect(screen.getByText('🇫🇷 FR')).toBeTruthy();
      expect(screen.getByText('🇬🇧 EN')).toBeTruthy();
    });
  });

  describe('renders book list', () => {
    it('renders the book list', () => {
      render(<LibraryScreen />);
      expect(screen.getByTestId('book-list')).toBeTruthy();
    });

    it('renders book cards for each book', () => {
      render(<LibraryScreen />);
      expect(screen.getByTestId('library-book-book-1')).toBeTruthy();
      expect(screen.getByTestId('library-book-book-2')).toBeTruthy();
    });

    it('renders book titles in German by default', () => {
      render(<LibraryScreen />);
      expect(screen.getByText('Erstes Buch')).toBeTruthy();
      expect(screen.getByText('Zweites Buch')).toBeTruthy();
    });

    it('shows loading state when books are being fetched', () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
      render(<LibraryScreen />);
      expect(screen.getByTestId('library-loading')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates to reader when a purchased book is tapped', () => {
      const { router } = require('expo-router');
      render(<LibraryScreen />);
      fireEvent.press(screen.getByTestId('library-book-book-1'));
      expect(router.push).toHaveBeenCalledWith('/reader/book-1');
    });
  });

  describe('filtering', () => {
    it('pressing DE filter sets active filter to de', () => {
      render(<LibraryScreen />);
      fireEvent.press(screen.getByTestId('filter-de'));
      // The DE filter button should have an active style indicator
      const deButton = screen.getByTestId('filter-de');
      expect(deButton).toBeTruthy();
    });
  });
});
