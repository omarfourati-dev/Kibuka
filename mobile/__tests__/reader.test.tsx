/**
 * @file reader.test.tsx
 * Tests for Kibuka Reader Screen (Task 20)
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

// Import after mocks are set up
// Dynamic import because the path has a dynamic segment — we import the default export directly
let ReaderScreen: React.ComponentType;

const mockUseQuery = useQuery as jest.Mock;

const mockBook = {
  id: 'book-1',
  theme: 'animals' as const,
  ageRange: '3-5' as const,
  coverImageUrl: 'https://example.com/cover.jpg',
  isDailyBook: false,
  publishedAt: '2026-05-11T00:00:00Z',
  pageCount: 3,
  priceSingle: 1.99,
  translations: {
    de: {
      language: 'de' as const,
      title: 'Kibuka und die Löwen',
      pages: [
        {
          pageNumber: 1,
          text: 'Es war einmal ein kleiner Löwe',
          illustrationUrl: 'https://example.com/page1.jpg',
          audioUrl: 'https://example.com/audio1.mp3',
          wordTimestamps: [
            { word: 'Es', startTime: 0, endTime: 200 },
            { word: 'war', startTime: 200, endTime: 400 },
          ],
        },
        {
          pageNumber: 2,
          text: 'Er lebte in der Savanne',
          illustrationUrl: 'https://example.com/page2.jpg',
          audioUrl: 'https://example.com/audio2.mp3',
          wordTimestamps: [],
        },
        {
          pageNumber: 3,
          text: 'Und alle lebten glücklich',
          illustrationUrl: 'https://example.com/page3.jpg',
          audioUrl: 'https://example.com/audio3.mp3',
          wordTimestamps: [],
        },
      ],
    },
    ar: { language: 'ar' as const, title: 'كيبوكا', pages: [] },
    fr: { language: 'fr' as const, title: 'Kibuka et les lions', pages: [] },
    en: { language: 'en' as const, title: 'Kibuka and the Lions', pages: [] },
  },
};

describe('ReaderScreen', () => {
  beforeAll(() => {
    // Import the component after all mocks are registered
    ReaderScreen = require('../app/(app)/reader/[id]').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: mockBook, isLoading: false });
  });

  describe('renders illustration', () => {
    it('renders the page illustration image', () => {
      render(<ReaderScreen />);
      expect(screen.getByTestId('page-illustration')).toBeTruthy();
    });
  });

  describe('renders text', () => {
    it('renders page text content', () => {
      render(<ReaderScreen />);
      expect(screen.getByTestId('page-text')).toBeTruthy();
    });

    it('renders the text of the first page', () => {
      render(<ReaderScreen />);
      expect(screen.getByText(/Es war einmal ein kleiner Löwe/)).toBeTruthy();
    });
  });

  describe('renders page navigation controls', () => {
    it('renders previous button', () => {
      render(<ReaderScreen />);
      expect(screen.getByTestId('prev-button')).toBeTruthy();
    });

    it('renders next button', () => {
      render(<ReaderScreen />);
      expect(screen.getByTestId('next-button')).toBeTruthy();
    });

    it('renders page counter showing current/total', () => {
      render(<ReaderScreen />);
      expect(screen.getByTestId('page-counter')).toBeTruthy();
      // First page: 1/3
      expect(screen.getByText('1/3')).toBeTruthy();
    });

    it('renders audio play/pause button', () => {
      render(<ReaderScreen />);
      expect(screen.getByTestId('audio-button')).toBeTruthy();
    });
  });

  describe('next button increments page', () => {
    it('increments page counter when next is pressed', () => {
      render(<ReaderScreen />);
      expect(screen.getByText('1/3')).toBeTruthy();
      fireEvent.press(screen.getByTestId('next-button'));
      expect(screen.getByText('2/3')).toBeTruthy();
    });
  });

  describe('prev button disabled on first page', () => {
    it('prev button is disabled on the first page', () => {
      render(<ReaderScreen />);
      const prevButton = screen.getByTestId('prev-button');
      // disabled prop should be true on page 0
      expect(prevButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('prev button is enabled after navigating to next page', () => {
      render(<ReaderScreen />);
      fireEvent.press(screen.getByTestId('next-button'));
      const prevButton = screen.getByTestId('prev-button');
      expect(prevButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('loading state', () => {
    it('shows loading indicator while book data is fetching', () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
      render(<ReaderScreen />);
      expect(screen.getByTestId('reader-loading')).toBeTruthy();
    });
  });
});
