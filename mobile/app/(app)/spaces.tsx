import { View, Text, FlatList, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'

export default function SpacesScreen() {
  const {
    data: spaces,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/spaces`,
      )
      if (!res.ok) throw new Error('Failed to load spaces')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="pt-16 px-4 pb-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Spaces</Text>
      </View>
      {error && (
        <View className="mx-4 p-4 bg-red-50 dark:bg-red-950 rounded-xl">
          <Text className="text-red-600 dark:text-red-400 text-sm">Failed to load spaces</Text>
        </View>
      )}
      <FlatList
        className="px-4"
        data={spaces ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 border border-slate-200 dark:border-slate-700">
            <Text className="font-semibold text-slate-900 dark:text-white text-lg">
              {item.name}
            </Text>
            <Text className="text-slate-400 text-sm mt-1 capitalize">{item.plan} plan</Text>
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-slate-400">No spaces yet</Text>
          </View>
        }
      />
    </View>
  )
}
