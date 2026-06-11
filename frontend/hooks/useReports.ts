'use client';

import { useEffect } from 'react';
import { useReportStore } from '@/store/reportStore';
import { ReportFilters } from '@/types';

/**
 * Hook untuk mengambil dan mengelola daftar laporan.
 * Auto-fetch saat mount, dan refetch saat filters berubah.
 *
 * Contoh:
 * const { reports, isLoading, error } = useReports({ status: 'PENDING' });
 */
export function useReports(filters?: ReportFilters) {
  const { reports, isLoading, error, meta, fetchReports, deleteReport, clearError } =
    useReportStore();

  useEffect(() => {
    fetchReports(filters);
    // Re-fetch jika filter berubah (stringify untuk deep comparison)
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  return { reports, isLoading, error, meta, deleteReport, clearError, refetch: () => fetchReports(filters) };
}

/**
 * Hook untuk mengambil satu laporan berdasarkan ID.
 *
 * Contoh:
 * const { report, isLoading } = useReport('laporan-id-123');
 */
export function useReport(id: string) {
  const { selectedReport, isLoading, error, fetchReportById } = useReportStore();

  useEffect(() => {
    if (id) fetchReportById(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { report: selectedReport, isLoading, error };
}
