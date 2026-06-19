'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, FileText, XCircle, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import ReportCard from '@/components/reports/ReportCard';
import type { Report, ReportStatus } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ReportStatus | ''; label: string }[] = [
  { value: '',            label: 'Semua Status' },
  { value: 'PENDING',     label: 'Menunggu Verifikasi' },
  { value: 'VERIFIED',    label: 'Terverifikasi' },
  { value: 'IN_PROGRESS', label: 'Sedang Diproses' },
  { value: 'RESOLVED',    label: 'Selesai' },
  { value: 'REJECTED',    label: 'Ditolak' },
];

const selectClass =
  'bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors';

// ─── Skeleton Card ─────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800 animate-pulse">
      <div className="h-48 bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-700 rounded-full w-full" />
        <div className="h-3 bg-slate-700 rounded-full w-2/3" />
        <div className="pt-2 flex justify-between">
          <div className="h-3 bg-slate-700 rounded-full w-1/3" />
          <div className="h-3 bg-slate-700 rounded-full w-1/4" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [meta, setMeta]       = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus]               = useState<ReportStatus | ''>('');
  const [sort, setSort]                   = useState<'newest' | 'oldest'>('newest');
  const [page, setPage]                   = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const handleStatusChange = (value: ReportStatus | '') => {
    setStatus(value);
    setPage(1);
  };

  const handleSortChange = (value: 'newest' | 'oldest') => {
    setSort(value);
    setPage(1);
  };

  const fetchMyReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 10, sort };
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;

      const res = await apiClient.get<{ success: boolean; data: Report[]; meta: Meta }>(
        '/reports/my',
        { params },
      );
      setReports(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
    } catch {
      setError('Gagal memuat laporan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, sort]);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  const hasFilters = debouncedSearch !== '' || status !== '';
  const from = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const to   = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  // Build page number list with ellipsis
  const pageItems: (number | '...')[] = [];
  if (meta) {
    const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1).filter(
      (p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1,
    );
    pages.forEach((p, idx) => {
      if (idx > 0 && p - (pages[idx - 1] as number) > 1) pageItems.push('...');
      pageItems.push(p);
    });
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Laporan Saya</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Kelola semua laporan yang telah Anda buat
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md shrink-0"
        >
          <Plus className="h-4 w-4" />
          Buat Laporan
        </Link>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Cari judul, deskripsi, atau alamat…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as ReportStatus | '')}
          className={`${selectClass} min-w-[170px]`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value as 'newest' | 'oldest')}
          className={`${selectClass} min-w-[130px]`}
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
        </select>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['s1', 's2', 's3', 's4', 's5', 's6'].map((k) => <SkeletonCard key={k} />)}
        </div>
      )}

      {/* ── Empty: no reports at all ── */}
      {!loading && !error && reports.length === 0 && !hasFilters && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
          <div className="h-14 w-14 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-blue-400" />
          </div>
          <p className="font-semibold text-slate-200 mb-1">Belum ada laporan</p>
          <p className="text-sm text-slate-500 mb-5 text-center max-w-xs">
            Mulai berkontribusi dengan melaporkan kerusakan jalan di sekitar Anda.
          </p>
          <Link
            href="/reports/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Buat Laporan Pertama
          </Link>
        </div>
      )}

      {/* ── Empty: no results for filter/search ── */}
      {!loading && !error && reports.length === 0 && hasFilters && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-700 rounded-2xl bg-slate-800/20">
          <Search className="h-10 w-10 text-slate-600 mb-3" />
          <p className="font-semibold text-slate-300 mb-1">Tidak ada laporan yang sesuai</p>
          <p className="text-sm text-slate-500 text-center max-w-xs">
            Tidak ada laporan yang sesuai dengan pencarian atau filter yang dipilih.
          </p>
        </div>
      )}

      {/* ── Report List ── */}
      {!loading && reports.length > 0 && (
        <>
          {meta && (
            <p className="text-sm text-slate-500">
              Menampilkan{' '}
              <span className="text-slate-300 font-medium">{from}–{to}</span>
              {' '}dari{' '}
              <span className="text-slate-300 font-medium">{meta.total}</span>
              {' '}laporan
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>

          {/* ── Pagination ── */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </button>

              <div className="flex items-center gap-1">
                {pageItems.map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-600 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === item
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
