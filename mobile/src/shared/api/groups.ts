import { api } from './client';
import { Group, GroupMember, Invitation } from '../lib/types';

export const groupsApi = {
  async list(): Promise<Group[]> {
    const res = await api.get('/groups/');
    return res.data;
  },

  async create(name: string): Promise<Group> {
    const res = await api.post('/groups/', { name });
    return res.data;
  },

  async get(id: string): Promise<Group> {
    const res = await api.get(`/groups/${id}/`);
    return res.data;
  },

  async rename(id: string, name: string): Promise<Group> {
    const res = await api.patch(`/groups/${id}/`, { name });
    return res.data;
  },

  async members(id: string): Promise<GroupMember[]> {
    const res = await api.get(`/groups/${id}/members/`);
    return res.data;
  },

  async invite(id: string, phone: string): Promise<Invitation> {
    const res = await api.post(`/groups/${id}/invitations/`, { phone });
    return res.data;
  },

  async leave(id: string): Promise<{ group_left: boolean; deleted_private_lists_count: number }> {
    const res = await api.post(`/groups/${id}/leave/`);
    return res.data;
  },
};

export const invitationsApi = {
  async incoming(): Promise<Invitation[]> {
    const res = await api.get('/invitations/incoming/');
    return res.data;
  },

  async accept(id: string): Promise<Invitation> {
    const res = await api.post(`/invitations/${id}/accept/`);
    return res.data;
  },

  async decline(id: string): Promise<Invitation> {
    const res = await api.post(`/invitations/${id}/decline/`);
    return res.data;
  },

  async cancel(id: string): Promise<Invitation> {
    const res = await api.post(`/invitations/${id}/cancel/`);
    return res.data;
  },
};
