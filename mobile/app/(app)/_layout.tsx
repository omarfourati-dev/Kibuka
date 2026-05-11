import { Tabs, router } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '@omarsapp/shared-stores'

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login')
    }
  }, [isAuthenticated])

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => null }} />
      <Tabs.Screen name="library" options={{ title: 'Bibliothek', tabBarIcon: () => null }} />
      <Tabs.Screen name="ai" options={{ title: 'AI', tabBarIcon: () => null }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: () => null }} />
      {/* reader is a stack screen, not shown in tab bar */}
      <Tabs.Screen
        name="reader"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  )
}
