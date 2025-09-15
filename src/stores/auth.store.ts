import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User } from '../types/api';
import { authService } from '../services/auth.service';
import { cacheWarming } from '../lib/apiOptimizer';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; username: string; firstName?: string; lastName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  clearError: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Login action
        login: async (email: string, password: string) => {
          set({ isLoading: true, error: null });

          try {
            const response = await authService.login({ email, password });

            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // 로그인 성공 시 중요한 데이터 프리로딩 (백그라운드)
            if (response.user?.id) {
              cacheWarming.warmupUserData(response.user.id).catch(error => {
                console.warn('Cache warming failed:', error);
              });
            }
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.response?.data?.message || error.message || 'Login failed',
            });
            throw error;
          }
        },

        // Register action
        register: async (userData) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await authService.register(userData);
            
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.response?.data?.message || error.message || 'Registration failed',
            });
            throw error;
          }
        },

        // Logout action
        logout: async () => {
          set({ isLoading: true });
          
          try {
            await authService.logout();
          } catch (error) {
            console.warn('Logout request failed:', error);
          } finally {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        // Refresh token action
        refreshToken: async () => {
          try {
            await authService.refreshToken();
            
            // Update user info if needed
            const currentUser = await authService.getCurrentUser();
            set({ user: currentUser });
          } catch (error: any) {
            // If refresh fails, logout user
            set({
              user: null,
              isAuthenticated: false,
              error: 'Session expired',
            });
            throw error;
          }
        },

        // Update profile action
        updateProfile: async (userData) => {
          const currentUser = get().user;
          if (!currentUser) {
            throw new Error('No user logged in');
          }

          set({ isLoading: true, error: null });
          
          try {
            const updatedUser = await authService.updateProfile(userData);
            
            set({
              user: updatedUser,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.response?.data?.message || error.message || 'Profile update failed',
            });
            throw error;
          }
        },

        // Clear error action
        clearError: () => {
          set({ error: null });
        },

        // Initialize auth from Supabase session
        initializeAuth: async () => {
          try {
            const user = await authService.getCurrentUser();
            const session = await authService.getSession();

            if (user && session) {
              set({
                user,
                isAuthenticated: true,
              });

              // 세션 복원 시 캐시 워밍업 (백그라운드)
              if (user.id) {
                cacheWarming.warmupUserData(user.id).catch(error => {
                  console.warn('Cache warming during auth init failed:', error);
                });
              }
            } else {
              set({
                user: null,
                isAuthenticated: false,
              });
            }
          } catch (error) {
            console.error('Auth initialization failed:', error);
            set({
              user: null,
              isAuthenticated: false,
            });
          }
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);