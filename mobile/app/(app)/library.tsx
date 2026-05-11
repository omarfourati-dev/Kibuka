import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { BookSummary, Language } from '@omarsapp/shared-types'

const FLAGS: Record<Language, string> = {
  de: '🇩🇪',
  ar: '🇸🇦',
  fr: '🇫🇷',
  en: '🇬🇧',
}

const LANGUAGES: Language[] = ['de', 'ar', 'fr', 'en']

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function LibraryScreen() {
  const [activeFilter, setActiveFilter] = useState<Language | 'all'>('all')

  const { data: books, isLoading } = useQuery<BookSummary[]>({
    queryKey: ['books', 'library'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/books`)
      if (!res.ok) throw new Error('Failed to load books')
      return res.json()
    },
  })

  const filtered =
    activeFilter === 'all' ? (books ?? []) : (books ?? []).filter((b) => b.titles[activeFilter])

  if (isLoading) {
    return (
      <View testID="library-loading" style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bibliothek</Text>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {/* All button */}
        <TouchableOpacity
          testID="filter-all"
          style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>
            Alle
          </Text>
        </TouchableOpacity>

        {/* Language buttons */}
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang}
            testID={`filter-${lang}`}
            style={[styles.filterButton, activeFilter === lang && styles.activeFilter]}
            onPress={() => setActiveFilter(lang)}
          >
            <Text
              style={[styles.filterText, activeFilter === lang && styles.activeFilterText]}
            >
              {FLAGS[lang]} {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Book List */}
      <FlatList
        testID="book-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`library-book-${item.id}`}
            style={styles.bookCard}
            onPress={() => router.push(`/reader/${item.id}`)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <Text style={styles.bookTitle} numberOfLines={2}>
              {item.titles.de}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.priceText}>
                {item.isPurchased ? '✓ Gekauft' : `€${item.priceSingle.toFixed(2)}`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>Keine Bücher gefunden</Text>
            <Text style={styles.emptySubtitle}>Probiere einen anderen Filter</Text>
          </View>
        }
      />
    </View>
  )
}

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
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeFilter: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeFilterText: {
    color: '#7C3AED',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  bookCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  coverImage: {
    width: '100%',
    height: 160,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1B4B',
    padding: 10,
    paddingBottom: 4,
  },
  metaRow: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  priceText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
})
