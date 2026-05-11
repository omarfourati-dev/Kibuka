// Jest setup for Kibuka mobile tests
// Mock expo modules that can't run in Node.js

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn().mockResolvedValue({}),
          pauseAsync: jest.fn().mockResolvedValue({}),
          unloadAsync: jest.fn().mockResolvedValue({}),
          setOnPlaybackStatusUpdate: jest.fn(),
          setPositionAsync: jest.fn().mockResolvedValue({}),
        },
        status: { isLoaded: true, positionMillis: 0 },
      }),
    },
    setAudioModeAsync: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  downloadAsync: jest.fn().mockResolvedValue({ status: 200, uri: 'file:///mock/downloaded' }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  readAsStringAsync: jest.fn().mockResolvedValue('{}'),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn().mockReturnValue({ id: 'book-1' }),
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  Stack: {
    Screen: 'Stack.Screen',
  },
  Link: 'Link',
}));

jest.mock('@omarsapp/shared-stores', () => ({
  useAuthStore: jest.fn().mockReturnValue({ user: { name: 'Test User' }, isAuthenticated: true }),
  useBookStore: jest.fn().mockReturnValue({
    dailyBook: null,
    library: [],
    isLoading: false,
    error: null,
    setDailyBook: jest.fn(),
    setLibrary: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    purchasedBookIds: new Set(),
  }),
  useReaderStore: jest.fn().mockReturnValue({
    currentBook: null,
    currentPage: 0,
    selectedLanguage: 'de',
    isPlaying: false,
    currentTime: 0,
    setBook: jest.fn(),
    setPage: jest.fn(),
    nextPage: jest.fn(),
    prevPage: jest.fn(),
    setLanguage: jest.fn(),
    setPlaying: jest.fn(),
    setCurrentTime: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Silence React Native warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
