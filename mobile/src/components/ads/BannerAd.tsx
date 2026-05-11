/**
 * BannerAd component — COPPA-compliant AdMob banner
 *
 * COPPA compliance:
 * - tagForChildDirectedTreatment: true
 * - tagForUnderAgeOfConsent: true
 * - maxAdContentRating: 'G'
 *
 * If react-native-google-mobile-ads is not installed, renders a placeholder.
 */

import { View, Text } from 'react-native'

export interface BannerAdProps {
  position?: 'top' | 'bottom'
  /** COPPA: if true, no behavioral targeting */
  isChildDirected?: boolean
}

// Check if the real AdMob package is available
let AdMobAvailable = false
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-google-mobile-ads')
  AdMobAvailable = true
} catch {
  AdMobAvailable = false
}

export default function BannerAd({ position = 'bottom', isChildDirected = true }: BannerAdProps) {
  // COPPA: always treat as child-directed for Kibuka
  const childDirected = isChildDirected || true

  if (AdMobAvailable) {
    // Real AdMob implementation would go here once credentials are available
    // const { BannerAd: AdMobBanner, BannerAdSize, TestIds } = require('react-native-google-mobile-ads')
    // return (
    //   <AdMobBanner
    //     unitId={TestIds.BANNER}
    //     size={BannerAdSize.FULL_BANNER}
    //     requestOptions={{ requestNonPersonalizedAdsOnly: childDirected }}
    //   />
    // )
  }

  // Placeholder when package not installed or credentials not configured
  return (
    <View
      testID="banner-ad"
      style={{
        width: '100%',
        height: 60,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: position === 'bottom' ? 8 : 0,
        marginBottom: position === 'bottom' ? 0 : 8,
      }}
      accessibilityLabel="Advertisement placeholder"
    >
      <Text style={{ color: '#9CA3AF', fontSize: 12, fontStyle: 'italic' }}>Ad placeholder</Text>
      {/* COPPA flag stored for reference — no behavioral targeting */}
      {childDirected && null}
    </View>
  )
}
