/**
 * @file home.test.tsx
 * Tests for Kibuka Home Screen (Task 19)
 * Written BEFORE implementation — TDD RED phase
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock @tanstack/react-query to control data/loading states
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  QueryClient: jest.fn().mockImplementation(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { useQuery } from '@tanstack/react-query';
import HomeScreen from '../app/(app)/home';

const mockUseQuery = useQuery as jest.Mock;

const mockDailyBook = {
  id: 'book-1',
  theme: 'animals' as const,
  ageRange: '3-5' as const,
  coverImageUrl: 'https://example.com/cover.jpg',
  isDailyBook: true,
  publishedAt: '2026-05-11T00:00:00Z',
  pageCount: 10,
  priceSingle: 1.99,
  titles: { de: 'Kibuka und die Löwen', ar: 'كيبوكا', fr: 'Kibuka et les lions', en: 'Kibuka and the Lions' },
  isPurchased: false,
};

const mockBooks = [
  { ...mockDailyBook, id: 'book-2', isDailyBook: false, titles: { de: 'Neues Buch', ar: '', fr: '', en: '' } },
  { ...mockDailyBook, id: 'book-3', isDailyBook: false, titles: { de: 'Drittes Buch', ar: '', fr: '', en: '' } },
];

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renders loading state', () => {
    it('shows ActivityIndicator when daily book is loading', () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
      render(<HomeScreen />);
      // Loading indicator should be present
      expect(screen.getByTestId('home-loading')).toBeTruthy();
    });
  });

  describe('renders daily book section', () => {
    it('renders the daily book cover image', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      expect(screen.getByTestId('daily-book-cover')).toBeTruthy();
    });

    it('renders the daily book title', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      expect(screen.getByText('Kibuka und die Löwen')).toBeTruthy();
    });

    it('renders "Buch des Tages" badge', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      expect(screen.getByText('Buch des Tages')).toBeTruthy();
    });

    it('renders Lesen and Kaufen CTAs', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      expect(screen.getByText('Lesen')).toBeTruthy();
      expect(screen.getByText('Kaufen')).toBeTruthy();
    });
  });

  describe('renders language flags', () => {
    it('renders all four language flags for the daily book', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      expect(screen.getByText('🇩🇪')).toBeTruthy();
      expect(screen.getByText('🇸🇦')).toBeTruthy();
      expect(screen.getByText('🇫🇷')).toBeTruthy();
      expect(screen.getByText('🇬🇧')).toBeTruthy();
    });
  });

  describe('navigates on book tap', () => {
    it('navigates to reader when Lesen is tapped on daily book', () => {
      const { router } = require('expo-router');
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      fireEvent.press(screen.getByText('Lesen'));
      expect(router.push).toHaveBeenCalledWith('/reader/book-1');
    });

    it('navigates to reader when a book in Neue Bücher row is tapped', () => {
      const { router } = require('expo-router');
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      const bookCard = screen.getByTestId('book-card-book-2');
      fireEvent.press(bookCard);
      expect(router.push).toHaveBeenCalledWith('/reader/book-2');
    });
  });

  describe('sections', () => {
    it('renders "Neue Bücher" section heading', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      expect(screen.getByText('Neue Bücher')).toBeTruthy();
    });

    it('renders Ad placeholder at bottom', () => {
      mockUseQuery
        .mockReturnValueOnce({ data: mockDailyBook, isLoading: false })
        .mockReturnValueOnce({ data: mockBooks, isLoading: false });
      render(<HomeScreen />);
      expect(screen.getByTestId('banner-ad')).toBeTruthy();
    });
  });
});
