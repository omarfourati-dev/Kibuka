import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@omarsapp/shared-types';
import { apiClient } from '../api-client';
import { queryKeys } from '../query-keys';

export function useMe() {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => apiClient.get<User>('/users/me'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsers(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => apiClient.get<{ items: User[]; total: number }>('/users', {
      headers: params ? { 'X-Params': JSON.stringify(params) } : undefined,
    }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.delete(`/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}
