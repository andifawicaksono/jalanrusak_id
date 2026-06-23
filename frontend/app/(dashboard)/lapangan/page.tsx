'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClipboardList, Search, XCircle, ChevronLeft, ChevronRight,
  AlertCircle,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import ReportCard from '@/components/reports/ReportCard';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Report, ReportStatus } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────

interface Meta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ReportStatus | ''; label: string }[] = [
  { value: '',            label: 'Semua Status'           },
  { value: 'PENDING',     label: 'Menunggu Verifikasi'    },
  { value: 'VERIFIED',    label: 'Diverifikasi'           },
  { value: 'IN_PROGRESS', label: 'Sedang Diproses'        },
  { value: 'RESOLVED',    label: 'Selesai'                },
  { value: 'REJECTED',    label: 'Ditolak'                },
];

// Urutan prioritas default yang diterapkan di backend
const PRIORITY_LABELS: Partial<Record<ReportStatus, string>> = {
  VERIFIED:    'Prioritas 1 — Perlu Ditindaklanjuti',
  IN_PROGRESS: 'Prioritas 2 — Sedang Dikerjakan',
  PENDING:     'Prioritas 3 — Menunggu Verifikasi',
  RESOLVED:    'Prioritas 4 — Selesai',
  REJECTED:    'Prioritas 5 — Ditolak',
};

const selectClass =
  'bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors';

// ─── Skeleton ──────────────────────────────────────────────────────

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

// ─── Priority separator ────────────────────────────────────────────

function PrioritySeparator({ status }: { readonly status: ReportStatus }) {
  const label = PRIORITY_LABELS[status];
  if (!label) return null;
  return (
    <div className="col-span-full flex items-center gap-3 mt-2 first:mt-0">
      <div className="flex-1 h-px bg-slate-800" />
      <span className="text-xs text-slate-600 font-medium whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function LapanganPage() {
  const { user, canManageProgress } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [meta,    setMeta]    = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status,          setStatus]          = useState<ReportStatus | ''>('');
  const [page,            setPage]            = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (status)          params.status = status;

      const res = await apiClient.get<{ success: boolean; data: Report[]; meta: Meta }>(
        '/reports/queue',
        { params },
      );
      setReports(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
    } catch {
      setError('Gagal memuat daftar laporan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => { void fetchQueue(); }, [fetchQueue]);

  // Authorization guard — render after auth is known
  if (!user) return null;
  if (!canManageProgress) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="font-semibold text-slate-200">Akses Ditolak</p>
        <p className="text-sm text-slate-500">Halaman ini hanya dapat diakses oleh Verifikator Lapangan dan Super Admin.</p>
      </div>
    );
  }

  const hasFilters = debouncedSearch !== '' || status !== '';
  const from = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const to   = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  // Pagination with ellipsis
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

  // Group reports by status for priority separators (only in default view without status filter)
  const showSeparators = status === '' && !debouncedSearch;
  let lastStatus: ReportStatus | null = null;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-orange-400" />
          Antrian Laporan
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Seluruh laporan diurutkan berdasarkan prioritas penanganan lapangan
        </p>
      </div>

      {/* ── Search & Filter ── */}
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
          className={`${selectClass} min-w-[185px]`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
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
          {['s1','s2','s3','s4','s5','s6'].map((k) => <SkeletonCard key={k} />)}
        </div>
      )}

      {/* ── Empty: no reports at all ── */}
      {!loading && !error && reports.length === 0 && !hasFilters && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
          <div className="h-14 w-14 rounded-2xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mb-4">
            <ClipboardList className="h-7 w-7 text-orange-400" />
          </div>
          <p className="font-semibold text-slate-200 mb-1">Belum ada laporan</p>
          <p className="text-sm text-slate-500 text-center max-w-xs">
            Saat ini belum ada laporan yang masuk ke dalam sistem.
          </p>
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
            {reports.map((report) => {
              const showSep = showSeparators && report.status !== lastStatus;
              if (showSep) lastStatus = report.status;

              return (
                <div key={report.id} className={cn('contents')}>
                  {showSep && <PrioritySeparator status={report.status} />}
                  <ReportCard report={report} showActions={false} />
                </div>
              );
            })}
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
                    <span key={`e-${idx}`} className="px-2 text-slate-600 text-sm">…</span>
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
