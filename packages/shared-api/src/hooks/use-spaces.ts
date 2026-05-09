import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Space } from '@omarsapp/shared-types';
import { apiClient } from '../api-client';
import { queryKeys } from '../query-keys';

export function useSpaces() {
  return useQuery({
    queryKey: queryKeys.spaces.list(),
    queryFn: () => apiClient.get<Space[]>('/spaces'),
  });
}

export function useSpace(id: string) {
  return useQuery({
    queryKey: queryKeys.spaces.detail(id),
    queryFn: () => apiClient.get<Space>(`/spaces/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      apiClient.post<Space>('/spaces', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all }),
  });
}
