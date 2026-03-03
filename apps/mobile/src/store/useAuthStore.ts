import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user) =>
    set({ user, isAuthenticated: true, isLoading: false }),

  logout: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),

  updateUser: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));