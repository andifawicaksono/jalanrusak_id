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
    /** True jika user adalah Super Admin */
    isAdmin: user?.role === 'ADMIN',
    /** True jika user adalah Verifikator Lapangan */
    isFieldVerifier: user?.role === 'FIELD_VERIFIER',
    /** True jika user dapat mengelola progress lapangan (update ke IN_PROGRESS / RESOLVED) */
    canManageProgress: user?.role === 'ADMIN' || user?.role === 'FIELD_VERIFIER',
  };
}
