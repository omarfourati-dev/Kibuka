/**
 * @file useBookDownload.test.ts
 * Tests for useBookDownload hook (Task 21)
 * Written BEFORE implementation — TDD RED phase
 */

import { renderHook, act } from '@testing-library/react-native';

// expo-file-system and expo-sqlite are mocked in jest.setup.js

import { useBookDownload } from '../src/hooks/useBookDownload';
import * as FileSystem from 'expo-file-system';

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

const BOOK_ID = 'test-book-123';

const mockBookData = {
  id: BOOK_ID,
  theme: 'animals',
  ageRange: '3-5',
  coverImageUrl: 'https://example.com/cover.jpg',
  pageCount: 2,
  priceSingle: 1.99,
  publishedAt: '2026-05-11T00:00:00Z',
  isDailyBook: false,
  translations: {
    de: {
      language: 'de',
      title: 'Test Buch',
      pages: [
        {
          pageNumber: 1,
          text: 'Seite eins',
          illustrationUrl: 'https://example.com/img1.jpg',
          audioUrl: 'https://example.com/audio1.mp3',
          wordTimestamps: [],
        },
        {
          pageNumber: 2,
          text: 'Seite zwei',
          illustrationUrl: 'https://example.com/img2.jpg',
          audioUrl: 'https://example.com/audio2.mp3',
          wordTimestamps: [],
        },
      ],
    },
  },
};

describe('useBookDownload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset file system mock: by default, nothing is downloaded
    (mockFileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    (mockFileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      status: 200,
      uri: 'file:///mock/downloaded',
    });
    (mockFileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);

    // Mock fetch for book data
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockBookData),
    }) as jest.Mock;
  });

  describe('initial status is not_downloaded', () => {
    it('starts with status "not_downloaded"', () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));
      expect(result.current.status).toBe('not_downloaded');
    });

    it('starts with progress 0', () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));
      expect(result.current.progress).toBe(0);
    });

    it('starts with isAvailableOffline false', () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));
      expect(result.current.isAvailableOffline).toBe(false);
    });
  });

  describe('download updates status to downloading then downloaded', () => {
    it('sets status to "downloading" during download', async () => {
      // Make downloadAsync slow to capture intermediate state
      let resolveDownload: () => void;
      const downloadPromise = new Promise<{ status: number; uri: string }>((resolve) => {
        resolveDownload = () => resolve({ status: 200, uri: 'file:///mock/downloaded' });
      });
      (mockFileSystem.downloadAsync as jest.Mock).mockReturnValue(downloadPromise);

      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      let downloadPromiseRef: Promise<void>;
      act(() => {
        downloadPromiseRef = result.current.download('de');
      });

      // Status should be downloading while in progress
      expect(result.current.status).toBe('downloading');

      // Resolve the download
      await act(async () => {
        resolveDownload!();
        await downloadPromiseRef;
      });

      expect(result.current.status).toBe('downloaded');
    });

    it('sets status to "downloaded" after successful download', async () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      await act(async () => {
        await result.current.download('de');
      });

      expect(result.current.status).toBe('downloaded');
    });

    it('sets progress to 1 after successful download', async () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      await act(async () => {
        await result.current.download('de');
      });

      expect(result.current.progress).toBe(1);
    });

    it('sets status to "error" when download fails', async () => {
      (mockFileSystem.downloadAsync as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      await act(async () => {
        await result.current.download('de');
      });

      expect(result.current.status).toBe('error');
    });
  });

  describe('isAvailableOffline returns true after download', () => {
    it('isAvailableOffline is true after a successful download', async () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      await act(async () => {
        await result.current.download('de');
      });

      expect(result.current.isAvailableOffline).toBe(true);
    });

    it('isAvailableOffline is false when download fails', async () => {
      (mockFileSystem.downloadAsync as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      await act(async () => {
        await result.current.download('de');
      });

      expect(result.current.isAvailableOffline).toBe(false);
    });

    it('isAvailableOffline is true if file already exists on disk', async () => {
      // Simulate that metadata already exists (previously downloaded)
      (mockFileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      // Wait for the effect to check existence
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isAvailableOffline).toBe(true);
    });
  });

  describe('download calls FileSystem APIs', () => {
    it('calls FileSystem.makeDirectoryAsync for book directory', async () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      await act(async () => {
        await result.current.download('de');
      });

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalled();
    });

    it('calls FileSystem.downloadAsync for cover image', async () => {
      const { result } = renderHook(() => useBookDownload(BOOK_ID));

      await act(async () => {
        await result.current.download('de');
      });

      // downloadAsync should be called at least once (for images/audio)
      expect(mockFileSystem.downloadAsync).toHaveBeenCalled();
    });
  });
});
