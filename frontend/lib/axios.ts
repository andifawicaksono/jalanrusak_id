import axios from 'axios';

/**
 * Instance axios yang sudah dikonfigurasi untuk berinteraksi dengan backend.
 * Semua request API menggunakan instance ini — jangan buat instance baru.
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  // Tidak set Content-Type default — axios otomatis set application/json untuk objek/string,
  // dan membiarkan browser set multipart/form-data+boundary untuk FormData.
});

/**
 * Request interceptor: tambahkan JWT token ke setiap request.
 * Token diambil dari localStorage — pastikan hanya diakses di sisi client.
 */
apiClient.interceptors.request.use(
  (config) => {
    // localStorage tidak tersedia di SSR, cek typeof window
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor: tangani error 401 secara global.
 * Jika token expired, hapus dari storage dan redirect ke login.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired atau tidak valid — paksa logout
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
