'use client';

import { useAuthStore } from '@/store/authStore';

/**
 * Custom hook untuk mengakses state autentikasi.
 * Wrapper tipis di atas useAuthStore untuk kemudahan penggunaan di komponen.
 *
 * Contoh:
 * const { user, isAuthenticated, isAdmin } = useAuth();
 */
export function useAuth() {
  const { user, token, isLoading, error, login, register, logout, clearError } = useAuthStore();

  return {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    /** True jika user sudah login */
    isAuthenticated: !!user && !!token,
    /** True jika user adalah admin */
    isAdmin: user?.role === 'ADMIN',
  };
}
