import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@omarsapp/shared-stores'
import { useQuery } from '@tanstack/react-query'

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/admin/stats`,
      )
      if (!res.ok) throw new Error('Failed to load stats')
      return res.json()
    },
  })

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="p-6 pt-16">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome, {user?.name ?? 'User'}
        </Text>
        <Text className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening</Text>

        {/* Stats Grid */}
        <View className="mt-6 flex-row flex-wrap gap-4">
          {[
            { label: 'Spaces', value: isLoading ? '...' : String(stats?.total_spaces ?? 0) },
            {
              label: 'AI Requests',
              value: isLoading ? '...' : String(stats?.ai_requests_today ?? 0),
            },
          ].map((stat) => (
            <View
              key={stat.label}
              className="flex-1 min-w-[140px] bg-white dark:bg-slate-800 rounded-2xl p-4"
            >
              <Text className="text-3xl font-bold text-blue-600">{stat.value}</Text>
              <Text className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View className="mt-8">
          <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </Text>
          <TouchableOpacity
            className="bg-blue-600 rounded-xl py-4 items-center mb-3"
            onPress={() => router.push('/(app)/ai')}
          >
            <Text className="text-white font-semibold">Open AI Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-4 items-center"
            onPress={() => router.push('/(app)/spaces')}
          >
            <Text className="text-slate-900 dark:text-white font-semibold">View Spaces</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}
