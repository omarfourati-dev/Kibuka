import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { BookSummary, Language } from '@omarsapp/shared-types'
import BannerAd from '../../src/components/ads/BannerAd'

const FLAGS: Record<Language, string> = {
  de: '🇩🇪',
  ar: '🇸🇦',
  fr: '🇫🇷',
  en: '🇬🇧',
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false)

  const {
    data: dailyBook,
    isLoading: isDailyLoading,
    refetch: refetchDaily,
  } = useQuery<BookSummary>({
    queryKey: ['books', 'daily'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/books/daily`)
      if (!res.ok) throw new Error('Failed to load daily book')
      return res.json()
    },
  })

  const {
    data: books,
    isLoading: isBooksLoading,
    refetch: refetchBooks,
  } = useQuery<BookSummary[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/books`)
      if (!res.ok) throw new Error('Failed to load books')
      return res.json()
    },
  })

  const isLoading = isDailyLoading || isBooksLoading

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchDaily(), refetchBooks()])
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <View
        testID="home-loading"
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    )
  }

  const newBooks = (books ?? []).filter((b) => !b.isDailyBook)
  const myBooks = (books ?? []).filter((b) => b.isPurchased)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFF9F0' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={{ padding: 20, paddingTop: 60 }}>
        {/* Header */}
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#1E1B4B', marginBottom: 20 }}>
          Kibuka 📚
        </Text>

        {/* Daily Book Section */}
        {dailyBook != null && (
          <View
            style={{
              backgroundColor: '#7C3AED',
              borderRadius: 20,
              padding: 16,
              marginBottom: 28,
            }}
          >
            {/* Badge */}
            <View
              style={{
                backgroundColor: '#F59E0B',
                alignSelf: 'flex-start',
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#1E1B4B', fontWeight: '700', fontSize: 12 }}>
                Buch des Tages
              </Text>
            </View>

            {/* Cover Image */}
            <Image
              testID="daily-book-cover"
              source={{ uri: dailyBook.coverImageUrl }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 14,
                marginBottom: 12,
              }}
              resizeMode="cover"
            />

            {/* Title */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#FFFFFF',
                marginBottom: 10,
              }}
            >
              {dailyBook.titles.de}
            </Text>

            {/* Language Flags */}
            <View
              style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}
              testID="language-flags"
            >
              {(Object.entries(FLAGS) as [Language, string][]).map(([lang, flag]) => (
                <Text key={lang} style={{ fontSize: 22 }}>
                  {flag}
                </Text>
              ))}
            </View>

            {/* CTAs */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#F59E0B',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={() => router.push(`/reader/${dailyBook.id}`)}
                accessibilityLabel="Buch lesen"
              >
                <Text style={{ color: '#1E1B4B', fontWeight: '700', fontSize: 16 }}>Lesen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.5)',
                }}
                onPress={() => {
                  /* Navigate to purchase */
                }}
                accessibilityLabel="Buch kaufen"
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Kaufen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Neue Bücher Section */}
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{ fontSize: 20, fontWeight: '700', color: '#1E1B4B', marginBottom: 14 }}
          >
            Neue Bücher
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={newBooks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`book-card-${item.id}`}
                style={{ marginRight: 14, width: 130 }}
                onPress={() => router.push(`/reader/${item.id}`)}
              >
                <Image
                  source={{ uri: item.coverImageUrl }}
                  style={{ width: 130, height: 160, borderRadius: 12, marginBottom: 8 }}
                  resizeMode="cover"
                />
                <Text
                  style={{ fontSize: 14, fontWeight: '600', color: '#1E1B4B' }}
                  numberOfLines={2}
                >
                  {item.titles.de}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Meine Bücher Section */}
        {myBooks.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{ fontSize: 20, fontWeight: '700', color: '#1E1B4B', marginBottom: 14 }}
            >
              Meine Bücher
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {myBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  testID={`my-book-${book.id}`}
                  style={{ width: '47%' }}
                  onPress={() => router.push(`/reader/${book.id}`)}
                >
                  <Image
                    source={{ uri: book.coverImageUrl }}
                    style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 8 }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{ fontSize: 14, fontWeight: '600', color: '#1E1B4B' }}
                    numberOfLines={2}
                  >
                    {book.titles.de}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Ad Banner at bottom */}
      <BannerAd position="bottom" isChildDirected />
    </ScrollView>
  )
}
