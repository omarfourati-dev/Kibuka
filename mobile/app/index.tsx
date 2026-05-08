import { Redirect } from 'expo-router'
import { useAuthStore } from '@omarsapp/shared-stores'

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return <Redirect href={isAuthenticated ? '/(app)/home' : '/(auth)/login'} />
}
