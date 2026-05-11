import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Audio } from 'expo-av'
import type { Book, Language, WordTimestamp } from '@omarsapp/shared-types'

const FLAGS: Record<Language, string> = {
  de: '🇩🇪',
  ar: '🇸🇦',
  fr: '🇫🇷',
  en: '🇬🇧',
}

const LANGUAGES: Language[] = ['de', 'ar', 'fr', 'en']

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const [currentPage, setCurrentPage] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('de')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const soundRef = useRef<Audio.Sound | undefined>(undefined)

  const { data: book, isLoading } = useQuery<Book>({
    queryKey: ['books', id, 'read'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/books/${id}/read`)
      if (!res.ok) throw new Error('Failed to load book')
      return res.json()
    },
    enabled: id != null,
  })

  const translation = book?.translations[selectedLanguage]
  const pages = translation?.pages ?? []
  const totalPages = pages.length > 0 ? pages.length : (book?.pageCount ?? 0)
  const page = pages[currentPage]

  // Unload previous sound on page change or language change
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined)
        soundRef.current = undefined
      }
      setIsPlaying(false)
      setCurrentTimeMs(0)
    }
  }, [currentPage, selectedLanguage])

  const handlePlayPause = useCallback(async () => {
    if (!page?.audioUrl) return

    try {
      if (isPlaying) {
        await soundRef.current?.pauseAsync()
        setIsPlaying(false)
        return
      }

      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: page.audioUrl },
          { shouldPlay: true },
        )
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setCurrentTimeMs(status.positionMillis ?? 0)
            if (status.didJustFinish) {
              setIsPlaying(false)
            }
          }
        })
        soundRef.current = sound
      } else {
        await soundRef.current.playAsync()
      }
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }, [isPlaying, page])

  const handleNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((p) => p + 1)
    }
  }, [currentPage, totalPages])

  const handlePrev = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1)
    }
  }, [currentPage])

  const isRTL = selectedLanguage === 'ar'

  if (isLoading) {
    return (
      <View testID="reader-loading" style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    )
  }

  if (!book || !translation) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Buch nicht gefunden</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Zurück</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Illustration */}
      <Image
        testID="page-illustration"
        source={page?.illustrationUrl ? { uri: page.illustrationUrl } : require('../../../assets/icon.png')}
        style={styles.illustration}
        resizeMode="cover"
      />

      {/* Page Text */}
      <ScrollView
        style={styles.textContainer}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
      >
        <View testID="page-text">
          {page != null ? (
            <WordHighlighter
              text={page.text}
              wordTimestamps={page.wordTimestamps}
              currentTimeMs={currentTimeMs}
              isRTL={isRTL}
            />
          ) : (
            <Text style={[styles.pageText, isRTL && styles.rtlText]}>
              {translation.title}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        {/* Prev Button */}
        <TouchableOpacity
          testID="prev-button"
          onPress={handlePrev}
          disabled={currentPage === 0}
          accessibilityState={{ disabled: currentPage === 0 }}
          style={[styles.navButton, currentPage === 0 && styles.disabledButton]}
        >
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>

        {/* Page Counter */}
        <Text testID="page-counter" style={styles.pageCounter}>
          {currentPage + 1}/{totalPages}
        </Text>

        {/* Next Button */}
        <TouchableOpacity
          testID="next-button"
          onPress={handleNext}
          disabled={currentPage >= totalPages - 1}
          accessibilityState={{ disabled: currentPage >= totalPages - 1 }}
          style={[styles.navButton, currentPage >= totalPages - 1 && styles.disabledButton]}
        >
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>

        {/* Language Selector */}
        <View style={styles.languageRow}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              onPress={() => setSelectedLanguage(lang)}
              style={[
                styles.langButton,
                selectedLanguage === lang && styles.activeLangButton,
              ]}
            >
              <Text style={styles.langFlag}>{FLAGS[lang]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Audio Play/Pause */}
        <TouchableOpacity
          testID="audio-button"
          onPress={handlePlayPause}
          style={styles.audioButton}
        >
          <Text style={styles.audioButtonText}>{isPlaying ? '⏸' : '▶️'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Word Highlighter Component ────────────────────────────────────────────────

interface WordHighlighterProps {
  text: string
  wordTimestamps: WordTimestamp[]
  currentTimeMs: number
  isRTL: boolean
}

function WordHighlighter({ text, wordTimestamps, currentTimeMs, isRTL }: WordHighlighterProps) {
  const words = text.split(' ')

  // Find active word index based on currentTimeMs
  const activeIndex = wordTimestamps.findIndex(
    (wt) => currentTimeMs >= wt.startTime && currentTimeMs <= wt.endTime,
  )

  return (
    <Text
      style={{
        fontSize: 22,
        lineHeight: 34,
        color: '#1E1B4B',
        flexWrap: 'wrap',
        textAlign: isRTL ? 'right' : 'left',
        writingDirection: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {words.map((word, index) => {
        const isActive = index === activeIndex && activeIndex !== -1
        return (
          <Text
            key={`${word}-${index}`}
            style={{
              backgroundColor: isActive ? '#FEF08A' : 'transparent',
              borderRadius: 4,
              fontSize: 22,
              color: '#1E1B4B',
            }}
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </Text>
        )
      })}
    </Text>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
  illustration: {
    width: '100%',
    height: 280,
  },
  textContainer: {
    flex: 1,
  },
  pageText: {
    fontSize: 22,
    lineHeight: 34,
    color: '#1E1B4B',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexWrap: 'wrap',
    gap: 8,
  },
  navButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    minWidth: 44,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  pageCounter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1B4B',
    minWidth: 50,
    textAlign: 'center',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 4,
  },
  langButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeLangButton: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  langFlag: {
    fontSize: 18,
  },
  audioButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    minWidth: 44,
    alignItems: 'center',
  },
  audioButtonText: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: '#7C3AED',
    textDecorationLine: 'underline',
  },
})
