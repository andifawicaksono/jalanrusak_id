'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ChevronLeft, ChevronRight, ExternalLink, Loader2,
  RefreshCw, Search, SlidersHorizontal,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import {
  cn, formatDate, getDamageTypeLabel, getStatusColor,
  getStatusLabel, getSeverityMapColor,
} from '@/lib/utils';
import type { DamageType, ReportStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import StatusUpdateModal, { type ReportToUpdate } from './StatusUpdateModal';

// ─── Types ───────────────────────────────────────────────────────────

interface ReportRow {
  id: string;
  reportNumber: string;
  title: string;
  damageType: DamageType;
  severity: number;
  status: ReportStatus;
  isAnonymous: boolean;
  address: string;
  reportedAt: string;
  createdAt: string;
  user: { id: string; name: string } | null;
}

interface ReportsApiResponse {
  success: boolean;
  reports?: ReportRow[];
  data?: ReportRow[];
  total: number;
  nextCursor?: string | null;
  meta?: { total: number; totalPages: number; page: number; limit: number };
}

interface Filters {
  search: string;
  status: string;
  damageType: string;
  dateFrom: string;
  dateTo: string;
  limit: number;
}

const DEFAULT_FILTERS: Filters = {
  search:     '',
  status:     '',
  damageType: '',
  dateFrom:   '',
  dateTo:     '',
  limit:      10,
};

const DAMAGE_TYPE_OPTIONS: { value: DamageType; label: string }[] = [
  { value: 'BERLUBANG', label: 'Berlubang' },
  { value: 'RETAK',     label: 'Retak' },
  { value: 'AMBLAS',    label: 'Amblas' },
  { value: 'BANJIR',    label: 'Tergenang Air' },
  { value: 'LONGSOR',   label: 'Longsor' },
  { value: 'LAINNYA',   label: 'Lainnya' },
];

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'PENDING',     label: 'Menunggu' },
  { value: 'VERIFIED',    label: 'Terverifikasi' },
  { value: 'IN_PROGRESS', label: 'Diproses' },
  { value: 'RESOLVED',    label: 'Selesai' },
  { value: 'REJECTED',    label: 'Ditolak' },
];

// ─── Severity Badge ───────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: number }) {
  const color = getSeverityMapColor(severity);
  const labels: Record<number, string> = { 1: 'Ringan', 2: 'Sedang', 3: 'Parah', 4: 'Kritis', 5: 'Darurat' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {severity} · {labels[severity] ?? '—'}
    </span>
  );
}

// ─── SWR Fetcher ─────────────────────────────────────────────────────

function buildKey(filters: Filters, cursor: string | null) {
  const params: Record<string, string> = { limit: String(filters.limit) };
  if (cursor)              params.cursor     = cursor;
  if (filters.search)      params.search     = filters.search;
  if (filters.status)      params.status     = filters.status;
  if (filters.damageType)  params.damageType = filters.damageType;
  if (filters.dateFrom)    params.dateFrom   = filters.dateFrom;
  if (filters.dateTo)      params.dateTo     = filters.dateTo;
  return ['/reports', new URLSearchParams(params).toString()] as const;
}

const fetcher = ([, qs]: [string, string]) =>
  apiClient
    .get<ReportsApiResponse>(`/reports?${qs}`)
    .then((r) => r.data);

// ─── Main Component ───────────────────────────────────────────────────

interface ReportsTableProps {
  readonly initialTotal?: number;
}

export default function ReportsTable({ initialTotal = 0 }: ReportsTableProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // Cursor stack for bidirectional pagination
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [pageIdx, setPageIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [modalReport, setModalReport] = useState<ReportToUpdate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Debounce search input (300ms)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [appliedSearch, setAppliedSearch] = useState('');

  const currentCursor = cursors[pageIdx];

  const effectiveFilters: Filters = { ...filters, search: appliedSearch };
  const swrKey = buildKey(effectiveFilters, currentCursor);

  const { data, isLoading, error, mutate } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  // Normalise API response (handles both cursor-based and page-based formats)
  const reports: ReportRow[] = data?.reports ?? (data?.data as ReportRow[] | undefined) ?? [];
  const total: number = data?.total ?? data?.meta?.total ?? initialTotal;
  const nextCursor: string | null = data?.nextCursor ?? null;
  const currentPage = pageIdx + 1;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  const handleSearchChange = useCallback((value: string) => {
    setFilters((f) => ({ ...f, search: value }));
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setAppliedSearch(value);
      // Reset to first page on search change
      setCursors([null]);
      setPageIdx(0);
    }, 300);
  }, []);

  const handleFilterChange = useCallback((key: keyof Filters, value: string | number) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setCursors([null]);
    setPageIdx(0);
  }, []);

  const handleNextPage = useCallback(() => {
    if (!nextCursor) return;
    const newCursors = [...cursors.slice(0, pageIdx + 1), nextCursor];
    setCursors(newCursors);
    setPageIdx(pageIdx + 1);
  }, [cursors, nextCursor, pageIdx]);

  const handlePrevPage = useCallback(() => {
    if (pageIdx === 0) return;
    setPageIdx(pageIdx - 1);
  }, [pageIdx]);

  const handleStatusUpdate = useCallback((report: ReportRow) => {
    setModalReport({
      id:            report.id,
      reportNumber:  report.reportNumber,
      title:         report.title,
      currentStatus: report.status,
    });
    setModalOpen(true);
  }, []);

  const handleModalSuccess = useCallback(() => {
    void mutate();
  }, [mutate]);

  const handleVerify = useCallback(async (report: ReportRow) => {
    try {
      await apiClient.patch(`/reports/${report.id}/status`, { status: 'VERIFIED' });
      void mutate();
    } catch {
      // User can use full modal for retry
      handleStatusUpdate(report);
    }
  }, [mutate, handleStatusUpdate]);

  return (
    <>
      <div className="bg-card border rounded-xl overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="p-4 border-b space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari judul atau nomor laporan..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Quick filter: status */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => handleFilterChange('status', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Toggle advanced filters */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(showFilters && 'bg-accent')}
              title="Filter lanjutan"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => void mutate()}
              title="Refresh data"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-1">
              <Select
                value={filters.damageType || 'all'}
                onValueChange={(v) => handleFilterChange('damageType', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Jenis Kerusakan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {DAMAGE_TYPE_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-36 text-sm"
                  placeholder="Dari tanggal"
                />
                <span className="text-muted-foreground text-sm">—</span>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-36 text-sm"
                  placeholder="Sampai tanggal"
                />
              </div>

              <Select
                value={String(filters.limit)}
                onValueChange={(v) => handleFilterChange('limit', Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} baris</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setAppliedSearch('');
                  setCursors([null]);
                  setPageIdx(0);
                }}
                className="text-muted-foreground"
              >
                Reset Filter
              </Button>
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['No. Laporan', 'Judul', 'Jenis', 'Severity', 'Status', 'Pelapor', 'Tanggal', 'Aksi'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-destructive">
                    Gagal memuat data. Coba refresh.
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Tidak ada laporan yang ditemukan.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors',
                      isLoading && 'opacity-60',
                    )}
                  >
                    {/* No. Laporan */}
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {report.reportNumber}
                    </td>

                    {/* Judul */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium text-foreground line-clamp-2 leading-snug">
                        {report.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {report.address}
                      </p>
                    </td>

                    {/* Jenis */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                      {getDamageTypeLabel(report.damageType)}
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">
                      <SeverityBadge severity={report.severity} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          getStatusColor(report.status),
                        )}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                    </td>

                    {/* Pelapor */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {report.isAnonymous
                        ? <span className="text-muted-foreground italic">Anonim</span>
                        : (report.user?.name ?? <span className="text-muted-foreground">—</span>)
                      }
                    </td>

                    {/* Tanggal */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(report.reportedAt ?? report.createdAt)}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {report.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => void handleVerify(report)}
                          >
                            Verifikasi
                          </Button>
                        )}
                        {!['RESOLVED', 'REJECTED'].includes(report.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleStatusUpdate(report)}
                          >
                            Update
                          </Button>
                        )}
                        <Link href={`/reports/${report.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <span>
            Halaman {currentPage} dari {totalPages} · {total.toLocaleString('id-ID')} laporan
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={pageIdx === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!nextCursor || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <StatusUpdateModal
        report={modalReport}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
