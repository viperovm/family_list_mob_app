import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listsApi, ListQuery } from '../../shared/api/lists';
import { queryKeys } from '../auth/queries';

export function useLists(query: ListQuery = {}) {
  return useQuery({
    queryKey: [...queryKeys.lists, query],
    queryFn: () => listsApi.list(query),
  });
}

export function useListDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.list(id),
    queryFn: () => listsApi.get(id),
  });
}

export function useAddItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => listsApi.addItem(listId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.list(listId) }),
  });
}

export function useUpdateItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      itemId: string;
      data: { text?: string; status?: string; priority?: boolean };
    }) => listsApi.updateItem(listId, input.itemId, input.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.list(listId) }),
  });
}

export function useDeleteItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => listsApi.deleteItem(listId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.list(listId) }),
  });
}

export function useRestoreItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => listsApi.restoreItem(listId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.list(listId) }),
  });
}

export function useReorderItems(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedItemIds: string[]) => listsApi.reorderItems(listId, orderedItemIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.list(listId) }),
  });
}

export function useArchiveList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lists });
    },
  });
}

export function useRestoreList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listsApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lists });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listsApi.deleteList(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lists });
    },
  });
}

export function useDuplicateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; mode: 'all' | 'uncompleted' }) =>
      listsApi.duplicate(input.id, input.mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lists });
    },
  });
}

export function useRenameList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      listsApi.rename(input.id, input.name),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.lists });
      qc.invalidateQueries({ queryKey: queryKeys.list(variables.id) });
    },
  });
}