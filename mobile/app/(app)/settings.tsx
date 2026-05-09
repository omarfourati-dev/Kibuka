import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@omarsapp/shared-stores'

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          clearUser()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="pt-16 px-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</Text>

        {/* Profile info */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-xs text-slate-400 uppercase tracking-wider mb-2">Profile</Text>
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">
            {user?.name ?? 'User'}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400">{user?.email}</Text>
        </View>

        {/* Actions */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden mb-4">
          <TouchableOpacity className="px-4 py-4 border-b border-slate-100 dark:border-slate-700">
            <Text className="text-slate-900 dark:text-white">Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-4 border-b border-slate-100 dark:border-slate-700">
            <Text className="text-slate-900 dark:text-white">Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-4">
            <Text className="text-slate-900 dark:text-white">Privacy</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-4 items-center"
          onPress={handleLogout}
        >
          <Text className="text-red-600 dark:text-red-400 font-semibold">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
