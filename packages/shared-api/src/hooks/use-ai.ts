import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Conversation, Document, AgentRun } from '@omarsapp/shared-types';
import { apiClient } from '../api-client';
import { queryKeys } from '../query-keys';

export function useConversations(spaceId: string) {
  return useQuery({
    queryKey: queryKeys.ai.conversations(spaceId),
    queryFn: () => apiClient.get<Conversation[]>(`/ai/conversations?space_id=${spaceId}`),
    enabled: Boolean(spaceId),
  });
}

export function useDocuments(spaceId: string) {
  return useQuery({
    queryKey: queryKeys.ai.documents(spaceId),
    queryFn: () => apiClient.get<Document[]>(`/ai/documents?space_id=${spaceId}`),
    enabled: Boolean(spaceId),
  });
}

export function useUploadDocument(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('space_id', spaceId);
      return apiClient.post<Document>('/ai/documents', formData, {
        headers: {},
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ai.documents(spaceId) }),
  });
}

export function useAgentRuns(spaceId: string) {
  return useQuery({
    queryKey: queryKeys.ai.agentRuns(spaceId),
    queryFn: () => apiClient.get<AgentRun[]>(`/ai/agents?space_id=${spaceId}`),
    enabled: Boolean(spaceId),
  });
}
