import { create } from 'zustand';
import type { User } from '../../../shared/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setAccessToken: (accessToken: string) => void;
}

const savedUser = localStorage.getItem('drobe_user');
const storedToken = localStorage.getItem('drobe_access_token');
const savedToken = storedToken === 'mock-access-token' ? null : storedToken;
if (storedToken === 'mock-access-token') {
  localStorage.removeItem('drobe_user');
  localStorage.removeItem('drobe_access_token');
}

export const useAuthStore = create<AuthState>((set) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  accessToken: savedToken,
  isAuthenticated: Boolean(savedUser && savedToken),
  setAuth: (user, accessToken) => { localStorage.setItem('drobe_user', JSON.stringify(user)); localStorage.setItem('drobe_access_token', accessToken); set({ user, accessToken, isAuthenticated: true }); },
  clearAuth: () => { localStorage.removeItem('drobe_user'); localStorage.removeItem('drobe_access_token'); set({ user: null, accessToken: null, isAuthenticated: false }); },
  setAccessToken: (accessToken) => set({ accessToken }),
}));
