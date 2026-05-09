export const queryKeys = {
  users: {
    all: ['users'] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    list: (params?: Record<string, unknown>) => [...queryKeys.users.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
  spaces: {
    all: ['spaces'] as const,
    list: () => [...queryKeys.spaces.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.spaces.all, 'detail', id] as const,
    members: (id: string) => [...queryKeys.spaces.all, 'members', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
  },
  ai: {
    all: ['ai'] as const,
    conversations: (spaceId: string) => [...queryKeys.ai.all, 'conversations', spaceId] as const,
    conversation: (id: string) => [...queryKeys.ai.all, 'conversation', id] as const,
    documents: (spaceId: string) => [...queryKeys.ai.all, 'documents', spaceId] as const,
    agentRuns: (spaceId: string) => [...queryKeys.ai.all, 'agent-runs', spaceId] as const,
    usage: () => [...queryKeys.ai.all, 'usage'] as const,
  },
  billing: {
    all: ['billing'] as const,
    subscription: (spaceId: string) => [...queryKeys.billing.all, 'subscription', spaceId] as const,
    invoices: (spaceId: string) => [...queryKeys.billing.all, 'invoices', spaceId] as const,
  },
} as const;
