import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/lib/axios';
import { User, AuthResponse } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  /** Login dengan email dan password */
  login: (email: string, password: string) => Promise<void>;

  /** Daftar akun baru */
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;

  /** Logout — hapus semua data autentikasi */
  logout: () => void;

  /** Reset pesan error */
  clearError: () => void;
}

/**
 * Store autentikasi menggunakan Zustand dengan persist middleware.
 * Data user dan token disimpan di localStorage agar tetap ada setelah refresh.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{ data: AuthResponse }>('/auth/login', {
            email,
            password,
          });
          const { user, accessToken } = response.data.data;

          // Simpan token di localStorage untuk dipakai oleh axios interceptor
          localStorage.setItem('auth_token', accessToken);

          set({ user, token: accessToken, isLoading: false });
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Login gagal. Periksa kembali email dan password Anda.';
          set({ error: message, isLoading: false });
        }
      },

      register: async (name, email, password, phone) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{ data: AuthResponse }>('/auth/register', {
            name,
            email,
            password,
            phone,
          });
          const { user, accessToken } = response.data.data;

          localStorage.setItem('auth_token', accessToken);
          set({ user, token: accessToken, isLoading: false });
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Pendaftaran gagal. Silakan coba lagi.';
          set({ error: message, isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage', // Kunci di localStorage
      // Hanya simpan user dan token, bukan loading/error state
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
