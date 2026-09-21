import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi, invitationsApi } from '../../shared/api/groups';
import { listsApi } from '../../shared/api/lists';
import { authApi } from '../../shared/api/auth';

export const queryKeys = {
  me: ['me'] as const,
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  members: (id: string) => ['groups', id, 'members'] as const,
  invitations: ['invitations'] as const,
  lists: ['lists'] as const,
  list: (id: string) => ['lists', id] as const,
};

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
  });
}

export function useGroups() {
  return useQuery({ queryKey: queryKeys.groups, queryFn: groupsApi.list });
}

export function useGroup(id: string) {
  return useQuery({ queryKey: queryKeys.group(id), queryFn: () => groupsApi.get(id) });
}

export function useGroupMembers(id: string) {
  return useQuery({
    queryKey: queryKeys.members(id),
    queryFn: () => groupsApi.members(id),
  });
}

export function useIncomingInvitations() {
  return useQuery({
    queryKey: queryKeys.invitations,
    queryFn: invitationsApi.incoming,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => groupsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      groupId: string;
      name: string;
      visibility: 'private' | 'group' | 'custom';
      participantIds?: string[];
    }) => listsApi.create(input.groupId, input.name, input.visibility, input.participantIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.lists }),
  });
}