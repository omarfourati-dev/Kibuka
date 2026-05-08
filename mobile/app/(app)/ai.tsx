import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function AIScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/ai/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage.content, conversation_id: null }),
        },
      )
      const data = await res.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content ?? data.message ?? 'No response',
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Error: Failed to get response',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50 dark:bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="pt-16 px-4 pb-2">
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">AI Chat</Text>
      </View>

      <FlatList
        ref={flatListRef}
        className="flex-1 px-4"
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View className={`my-1 ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
            <View
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                item.role === 'user'
                  ? 'bg-blue-600'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Text
                className={item.role === 'user' ? 'text-white' : 'text-slate-900 dark:text-white'}
              >
                {item.content}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-slate-400">Start a conversation</Text>
          </View>
        }
      />

      {loading && (
        <View className="px-4 pb-2">
          <Text className="text-slate-400 text-sm">AI is thinking...</Text>
        </View>
      )}

      <View className="flex-row px-4 pb-8 gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
        <TextInput
          className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3
                     text-slate-900 dark:text-white bg-white dark:bg-slate-800"
          placeholder="Message..."
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          className={`rounded-xl px-5 py-3 items-center justify-center ${
            loading || !input.trim() ? 'bg-blue-300' : 'bg-blue-600'
          }`}
          onPress={handleSend}
          disabled={loading || !input.trim()}
        >
          <Text className="text-white font-semibold">Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
