import { create } from 'zustand';

export type UserType = 'owner' | 'girlfriend';

interface AuthState {
  isLocked: boolean;
  currentUser: string | null;
  userType: UserType | null;
  ownerId: string | null;
  unlock: () => void;
  login: (userId: string, type: UserType, ownerId?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLocked: true,
  currentUser: null,
  userType: null,
  ownerId: null,
  unlock: () => set({ isLocked: false }),
  login: (userId: string, type: UserType, ownerId?: string) => 
    set({ currentUser: userId, userType: type, ownerId: ownerId || userId }),
  logout: () => 
    set({ 
      isLocked: true, 
      currentUser: null, 
      userType: null, 
      ownerId: null 
    }),
}));