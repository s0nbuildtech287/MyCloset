import { create } from 'zustand';
import type { Closet } from '../../../shared/types';
import { apiClient } from '../api/client';
import { useAuthStore } from './authStore';

interface ClosetState {
  closets: Closet[];
  activeClosetId: string;
  loading: boolean;
  fetchClosets: () => Promise<void>;
  setActiveClosetId: (id: string) => void;
  addCloset: (name: string) => Promise<void>;
  deleteCloset: (id: string) => Promise<void>;
}

export const useClosetStore = create<ClosetState>((set, get) => ({
  closets: [],
  activeClosetId: localStorage.getItem('activeClosetId') || '',
  loading: false,
  fetchClosets: async () => {
    set({ loading: true });
    const isBypass = useAuthStore.getState().accessToken === 'mock-access-token';
    
    try {
      if (isBypass) {
        throw new Error('Using mock closets in bypass mode');
      }

      const res = await apiClient.get('/closets');
      const closets = res.data;
      if (!Array.isArray(closets)) {
        throw new Error('Response is not an array of closets');
      }
      set({ closets });
      
      const activeExists = closets.some((c: any) => c.id === get().activeClosetId);
      if (!activeExists && closets.length > 0) {
        const defaultCloset = closets.find((c: any) => c.isDefault) || closets[0];
        get().setActiveClosetId(defaultCloset.id);
      }
    } catch (err) {
      console.error('Failed to fetch closets:', err);
      // Ensure we always have at least one valid closet array, even on errors
      if (isBypass || !Array.isArray(get().closets) || get().closets.length === 0) {
        const mockClosets = [
          {
            id: "default-closet",
            name: "Tủ đồ chính",
            isDefault: true,
            userId: "mock-user-id",
            createdAt: new Date().toISOString()
          }
        ];
        set({ closets: mockClosets });
        get().setActiveClosetId("default-closet");
      }
    } finally {
      set({ loading: false });
    }
  },
  setActiveClosetId: (id) => {
    localStorage.setItem('activeClosetId', id);
    set({ activeClosetId: id });
  },
  addCloset: async (name) => {
    try {
      const res = await apiClient.post('/closets', { name });
      const newCloset = res.data;
      set({ closets: [...get().closets, newCloset] });
      get().setActiveClosetId(newCloset.id);
    } catch (err) {
      console.error('Failed to add closet:', err);
      throw err;
    }
  },
  deleteCloset: async (id) => {
    try {
      await apiClient.delete(`/closets/${id}`);
      const updatedClosets = get().closets.filter((c) => c.id !== id);
      set({ closets: updatedClosets });
      if (get().activeClosetId === id && updatedClosets.length > 0) {
        const defaultCloset = updatedClosets.find((c) => c.isDefault) || updatedClosets[0];
        get().setActiveClosetId(defaultCloset.id);
      }
    } catch (err) {
      console.error('Failed to delete closet:', err);
      throw err;
    }
  }
}));
