import { create } from 'zustand';
import apiClient from '@/lib/axios';
import { Report, CreateReportInput, ReportFilters } from '@/types';

interface ReportState {
  reports: Report[];
  selectedReport: Report | null;
  isLoading: boolean;
  error: string | null;
  meta: { page: number; total: number; totalPages: number } | null;

  /** Ambil daftar laporan dengan filter opsional */
  fetchReports: (filters?: ReportFilters) => Promise<void>;

  /** Ambil satu laporan berdasarkan ID */
  fetchReportById: (id: string) => Promise<void>;

  /** Buat laporan baru dengan form data (termasuk foto) */
  createReport: (input: CreateReportInput) => Promise<Report | null>;

  /** Hapus laporan */
  deleteReport: (id: string) => Promise<void>;

  /** Reset pesan error */
  clearError: () => void;
}

/**
 * Store untuk manajemen laporan.
 * Tidak menggunakan persist — data selalu fresh dari server.
 */
export const useReportStore = create<ReportState>((set) => ({
  reports: [],
  selectedReport: null,
  isLoading: false,
  error: null,
  meta: null,

  fetchReports: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ reports?: Report[]; data?: Report[] }>('/reports', {
        params: filters,
      });
      // Backend returns cursor-based: { reports, nextCursor, hasMore }
      // Fallback to offset-based: { data, meta }
      const reports = response.data.reports ?? response.data.data ?? [];
      set({ reports, isLoading: false });
    } catch {
      set({ error: 'Gagal memuat daftar laporan', isLoading: false });
    }
  },

  fetchReportById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<{ data: Report }>(`/reports/${id}`);
      set({ selectedReport: response.data.data, isLoading: false });
    } catch {
      set({ error: 'Laporan tidak ditemukan', isLoading: false });
    }
  },

  createReport: async (input) => {
    set({ isLoading: true, error: null });
    try {
      // Gunakan FormData untuk mengirim file foto bersama data teks
      const formData = new FormData();
      formData.append('title', input.title);
      formData.append('description', input.description);
      formData.append('latitude', String(input.latitude));
      formData.append('longitude', String(input.longitude));
      formData.append('address', input.address);
      formData.append('severity', String(input.severity));

      if (input.photos) {
        Array.from(input.photos).forEach((file) => {
          formData.append('photos', file);
        });
      }

      const response = await apiClient.post<{ data: Report }>('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newReport = response.data.data!;
      // Tambahkan laporan baru ke awal daftar
      set((state) => ({ reports: [newReport, ...state.reports], isLoading: false }));
      return newReport;
    } catch {
      set({ error: 'Gagal membuat laporan', isLoading: false });
      return null;
    }
  },

  deleteReport: async (id) => {
    await apiClient.delete(`/reports/${id}`);
    set((state) => ({
      reports: state.reports.filter((r) => r.id !== id),
    }));
  },

  clearError: () => set({ error: null }),
}));
