import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@omarsapp/shared-stores'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      )
      if (!res.ok) throw new Error('Invalid credentials')
      const data = await res.json()
      setUser(data.user)
      router.replace('/(app)/home')
    } catch (e: unknown) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</Text>
        <Text className="text-slate-500 dark:text-slate-400 mb-8">Sign in to your account</Text>

        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 mb-4
                     text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 mb-6
                     text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          className={`rounded-xl py-4 items-center ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
