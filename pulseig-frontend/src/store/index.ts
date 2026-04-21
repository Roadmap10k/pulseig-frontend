import { create } from 'zustand';
import { authApi } from '../api';

interface Business {
  id: string;
  name: string;
  email: string;
  plan: string;
  instagram_handle?: string;
}

interface AuthStore {
  business: Business | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  business: null,
  token: null,
  loading: false,

  loadFromStorage: async () => {
    const token = localStorage.getItem('pulseig_token');
    if (!token) return;
    try {
      const res = await authApi.me();
      set({ business: res.data, token });
    } catch {
      localStorage.removeItem('pulseig_token');
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await authApi.login(email, password);
      const { token, business } = res.data;
      localStorage.setItem('pulseig_token', token);
      set({ token, business, loading: false });
    } catch (err: any) {
      set({ loading: false });
      throw new Error(err.response?.data?.error || 'Error al iniciar sesión');
    }
  },

  logout: () => {
    localStorage.removeItem('pulseig_token');
    set({ business: null, token: null });
  },
}));

// ─── UI Store ────────────────────────────────────────────────
interface UIStore {
  activeView: string;
  setActiveView: (view: string) => void;
  selectedConversationId: string | null;
  setSelectedConversation: (id: string | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeView: 'inbox',
  setActiveView: (view) => set({ activeView: view }),
  selectedConversationId: null,
  setSelectedConversation: (id) => set({ selectedConversationId: id }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
