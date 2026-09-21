import { create } from 'zustand';
import { AuthTokens, User } from '../../shared/lib/types';
import { tokenStorage } from '../../shared/storage/storage';

interface AuthState {
  user: User | null;
  access: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  registerStep: 'phone' | 'email' | 'code';
  registrationToken: string | null;
  loginChallenge: string | null;
  maskedEmail: string | null;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setRegistrationToken: (token: string) => void;
  setLoginChallenge: (challenge: string | null, maskedEmail?: string | null) => void;
  clearLoginChallenge: () => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  access: null,
  isAuthenticated: false,
  isHydrated: false,
  registerStep: 'phone',
  registrationToken: null,
  loginChallenge: null,
  maskedEmail: null,

  setTokens: (tokens) => {
    tokenStorage.setTokens(tokens.access, tokens.refresh);
    set({ access: tokens.access, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  setRegistrationToken: (token) =>
    set({ registrationToken: token, registerStep: 'email' }),

  setLoginChallenge: (challenge, maskedEmail = null) =>
    set({ loginChallenge: challenge, maskedEmail }),

  clearLoginChallenge: () => set({ loginChallenge: null, maskedEmail: null }),

  logout: () => {
    tokenStorage.clear();
    set({
      user: null,
      access: null,
      isAuthenticated: false,
      registrationToken: null,
      loginChallenge: null,
      maskedEmail: null,
      registerStep: 'phone',
    });
  },

  hydrate: () => {
    const access = tokenStorage.getAccess();
    set({ access, isAuthenticated: !!access, isHydrated: true });
  },
}));