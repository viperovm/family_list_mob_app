import { api } from './client';
import {
  ListDetail,
  ListItem,
  ListSection,
  ListStatusFilter,
  ListVisibility,
  ShoppingList,
} from '../lib/types';

export interface ListQuery {
  group_id?: string;
  section?: ListSection;
  status?: ListStatusFilter;
  q?: string;
}

export const listsApi = {
  async list(query: ListQuery = {}): Promise<ShoppingList[]> {
    const params: Record<string, string> = {};
    if (query.group_id) params.group_id = query.group_id;
    if (query.section && query.section !== 'all') params.section = query.section;
    if (query.status) params.status = query.status;
    if (query.q) params.q = query.q;
    const res = await api.get('/lists', { params });
    return res.data;
  },

  async create(
    groupId: string,
    name: string,
    visibility: ListVisibility,
    participantIds: string[] = [],
  ): Promise<ShoppingList> {
    const res = await api.post('/lists', {
      group_id: groupId,
      name,
      visibility,
      participant_ids: participantIds,
    });
    return res.data;
  },

  async get(id: string): Promise<ListDetail> {
    const res = await api.get(`/lists/${id}`);
    return res.data;
  },

  async rename(id: string, name: string): Promise<ShoppingList> {
    const res = await api.patch(`/lists/${id}`, { name });
    return res.data;
  },

  async archive(id: string): Promise<ShoppingList> {
    const res = await api.post(`/lists/${id}/archive`);
    return res.data;
  },

  async restore(id: string): Promise<ShoppingList> {
    const res = await api.post(`/lists/${id}/restore`);
    return res.data;
  },

  async deleteList(id: string): Promise<{ id: string; deleted: boolean }> {
    const res = await api.post(`/lists/${id}/delete`);
    return res.data;
  },

  async duplicate(id: string, mode: 'all' | 'uncompleted'): Promise<ShoppingList> {
    const res = await api.post(`/lists/${id}/duplicate`, { mode });
    return res.data;
  },

  async addItem(listId: string, text: string, priority = false): Promise<ListItem> {
    const res = await api.post(`/lists/${listId}/items`, { text, priority });
    return res.data;
  },

  async updateItem(
    listId: string,
    itemId: string,
    data: { text?: string; status?: string; priority?: boolean },
  ): Promise<ListItem> {
    const res = await api.patch(`/lists/${listId}/items/${itemId}`, data);
    return res.data;
  },

  async deleteItem(listId: string, itemId: string): Promise<{ id: string; deleted: boolean }> {
    const res = await api.delete(`/lists/${listId}/items/${itemId}`);
    return res.data;
  },

  async restoreItem(listId: string, itemId: string): Promise<ListItem> {
    const res = await api.post(`/lists/${listId}/items/${itemId}/restore`);
    return res.data;
  },

  async reorderItems(listId: string, orderedItemIds: string[]): Promise<ListItem[]> {
    const res = await api.post(`/lists/${listId}/items/reorder`, {
      ordered_item_ids: orderedItemIds,
    });
    return res.data;
  },
};
