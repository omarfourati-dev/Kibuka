import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import '../global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})

/**
 * Configure AdMob for COPPA compliance at app startup.
 * Kibuka is a children's app — all requests are child-directed.
 * react-native-google-mobile-ads is optional; this is a no-op if not installed.
 */
function useAdMobCoppaSetup() {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MobileAds, MaxAdContentRating } = require('react-native-google-mobile-ads')
      MobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
      })
    } catch {
      // Package not installed — COPPA config is a no-op
    }
  }, [])
}

export default function RootLayout() {
  useAdMobCoppaSetup()

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}
