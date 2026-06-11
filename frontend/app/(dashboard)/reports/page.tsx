'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Plus, Loader2 } from 'lucide-react';
import { useReportStore } from '@/store/reportStore';
import ReportCard from '@/components/reports/ReportCard';

export default function ReportsPage() {
  const { reports, isLoading, error, fetchReports } = useReportStore();

  // Muat laporan saat halaman pertama kali dibuka
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Saya</h1>
          <p className="text-muted-foreground">Kelola semua laporan yang telah Anda buat</p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Buat Laporan
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (reports ?? []).length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground mb-4">Anda belum memiliki laporan</p>
          <Link
            href="/reports/new"
            className="text-primary hover:underline text-sm font-medium"
          >
            Buat laporan pertama Anda
          </Link>
        </div>
      )}

      {/* Report Grid */}
      {!isLoading && (reports ?? []).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(reports ?? []).map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
