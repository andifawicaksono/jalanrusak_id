'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollText, Search, RefreshCw, ChevronLeft, ChevronRight,
  XCircle, Filter, X,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn, formatDateTime, getRoleDisplayName, getRoleBadgeClass } from '@/lib/utils';
import type { AuditLog, UserRole } from '@/types';

// ─── Constants ─────────────────────────────────────────────────────

const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  {
    label: 'Autentikasi',
    actions: ['AUTH_REGISTER', 'AUTH_LOGIN', 'AUTH_GOOGLE_LOGIN', 'AUTH_LOGOUT'],
  },
  {
    label: 'Manajemen User',
    actions: ['USER_CREATE', 'USER_UPDATE_ROLE', 'USER_ENABLE', 'USER_DISABLE', 'USER_BAN'],
  },
  {
    label: 'Laporan',
    actions: ['REPORT_CREATE', 'REPORT_VERIFY', 'REPORT_REJECT', 'REPORT_IN_PROGRESS', 'REPORT_RESOLVED', 'REPORT_DELETE'],
  },
];

const ACTION_LABELS: Record<string, string> = {
  AUTH_REGISTER:       'Registrasi',
  AUTH_LOGIN:          'Login',
  AUTH_GOOGLE_LOGIN:   'Login Google',
  AUTH_LOGOUT:         'Logout',
  USER_CREATE:         'Buat User',
  USER_UPDATE_ROLE:    'Ubah Role',
  USER_ENABLE:         'Aktifkan Akun',
  USER_DISABLE:        'Nonaktifkan Akun',
  USER_BAN:            'Ban Akun',
  REPORT_CREATE:       'Buat Laporan',
  REPORT_VERIFY:       'Verifikasi Laporan',
  REPORT_REJECT:       'Tolak Laporan',
  REPORT_IN_PROGRESS:  'Mulai Proses',
  REPORT_RESOLVED:     'Selesaikan Laporan',
  REPORT_DELETE:       'Hapus Laporan',
};

const ACTION_BADGE_CLS: Record<string, string> = {
  AUTH_REGISTER:       'bg-green-500/15 text-green-400 border-green-500/20',
  AUTH_LOGIN:          'bg-blue-500/15 text-blue-400 border-blue-500/20',
  AUTH_GOOGLE_LOGIN:   'bg-blue-500/15 text-blue-400 border-blue-500/20',
  AUTH_LOGOUT:         'bg-slate-500/15 text-slate-400 border-slate-500/20',
  USER_CREATE:         'bg-purple-500/15 text-purple-400 border-purple-500/20',
  USER_UPDATE_ROLE:    'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  USER_ENABLE:         'bg-green-500/15 text-green-400 border-green-500/20',
  USER_DISABLE:        'bg-amber-500/15 text-amber-400 border-amber-500/20',
  USER_BAN:            'bg-red-500/15 text-red-400 border-red-500/20',
  REPORT_CREATE:       'bg-teal-500/15 text-teal-400 border-teal-500/20',
  REPORT_VERIFY:       'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  REPORT_REJECT:       'bg-red-500/15 text-red-400 border-red-500/20',
  REPORT_IN_PROGRESS:  'bg-orange-500/15 text-orange-400 border-orange-500/20',
  REPORT_RESOLVED:     'bg-green-500/15 text-green-400 border-green-500/20',
  REPORT_DELETE:       'bg-red-500/15 text-red-400 border-red-500/20',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'PUBLIC',         label: 'Pelapor'              },
  { value: 'VERIFIER',       label: 'Admin Verifikator'    },
  { value: 'FIELD_VERIFIER', label: 'Verifikator Lapangan' },
  { value: 'ADMIN',          label: 'Super Admin'          },
];

const selectCls =
  'bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors';

// ─── Types ─────────────────────────────────────────────────────────

interface Meta {
  page: number; limit: number; total: number; totalPages: number;
}

// ─── Skeleton ──────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-slate-800 animate-pulse">
      <div className="shrink-0 mt-1 h-3 w-28 bg-slate-800 rounded" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-800 rounded-full" />
          <div className="h-5 w-20 bg-slate-800 rounded-full" />
        </div>
        <div className="h-3.5 w-full max-w-sm bg-slate-800 rounded" />
      </div>
      <div className="h-3 w-20 bg-slate-800 rounded shrink-0" />
    </div>
  );
}

// ─── Filter Drawer ─────────────────────────────────────────────────

interface FilterDrawerProps {
  readonly role:      UserRole | '';
  readonly action:    string;
  readonly dateFrom:  string;
  readonly dateTo:    string;
  readonly onApply: (filters: { role: UserRole | ''; action: string; dateFrom: string; dateTo: string }) => void;
  readonly onClose: () => void;
}

function FilterDrawer({ role: initRole, action: initAction, dateFrom: initFrom, dateTo: initTo, onApply, onClose }: FilterDrawerProps) {
  const [role,     setRole]     = useState<UserRole | ''>(initRole);
  const [action,   setAction]   = useState(initAction);
  const [dateFrom, setDateFrom] = useState(initFrom);
  const [dateTo,   setDateTo]   = useState(initTo);

  const inputCls = `${selectCls} w-full`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xs bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Filter className="h-4 w-4 text-purple-400" />Filter</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole | '')} className={inputCls}>
              <option value="">Semua Role</option>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Aksi</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
              <option value="">Semua Aksi</option>
              {ACTION_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sampai Tanggal</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-800 flex gap-3">
          <button onClick={() => { setRole(''); setAction(''); setDateFrom(''); setDateTo(''); }}
            className="flex-1 py-2.5 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors">
            Reset
          </button>
          <button onClick={() => { onApply({ role, action, dateFrom, dateTo }); onClose(); }}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors">
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Log Row ───────────────────────────────────────────────────────

function LogRow({ log, isLast }: { readonly log: AuditLog; readonly isLast: boolean }) {
  const actionLabel = ACTION_LABELS[log.action] ?? log.action;
  const badgeCls    = ACTION_BADGE_CLS[log.action] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20';

  return (
    <div className={cn('grid lg:grid-cols-[160px_1fr_130px] gap-2 lg:gap-4 px-5 py-4 items-start', !isLast && 'border-b border-slate-800')}>
      {/* Timestamp */}
      <p className="text-xs text-slate-500 font-mono mt-0.5 shrink-0">{formatDateTime(log.createdAt)}</p>

      {/* Main content */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border', badgeCls)}>
            {actionLabel}
          </span>
          {log.user && (
            <span className={cn('inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border', getRoleBadgeClass(log.user.role))}>
              {getRoleDisplayName(log.user.role)}
            </span>
          )}
        </div>
        {log.user && (
          <p className="text-sm text-slate-300 font-medium">{log.user.name} <span className="text-slate-500 font-normal">({log.user.email})</span></p>
        )}
        {!log.user && <p className="text-sm text-slate-500 italic">User tidak ditemukan</p>}
        {log.description && <p className="text-sm text-slate-400">{log.description}</p>}
        {log.entityType && log.entityId && (
          <p className="text-xs text-slate-600 font-mono">{log.entityType} #{log.entityId.slice(0, 8)}…</p>
        )}
      </div>

      {/* IP */}
      <p className="text-xs text-slate-600 font-mono mt-0.5 hidden lg:block truncate">{log.ipAddress ?? '—'}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [meta,    setMeta]    = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role,            setRole]            = useState<UserRole | ''>('');
  const [action,          setAction]          = useState('');
  const [dateFrom,        setDateFrom]        = useState('');
  const [dateTo,          setDateTo]          = useState('');
  const [page,            setPage]            = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(v); setPage(1); }, 300);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 30 };
      if (debouncedSearch) params.search   = debouncedSearch;
      if (role)            params.role     = role;
      if (action)          params.action   = action;
      if (dateFrom)        params.dateFrom = dateFrom;
      if (dateTo)          params.dateTo   = dateTo;

      const res = await apiClient.get<{ data: AuditLog[]; meta: Meta }>('/settings/audit-logs', { params });
      setLogs(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
    } catch {
      setError('Gagal memuat audit log. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, role, action, dateFrom, dateTo]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const activeFilterCount = [role, action, dateFrom, dateTo].filter(Boolean).length;

  const from = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const to   = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  const pageItems: (number | '...')[] = [];
  if (meta) {
    const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1);
    pages.forEach((p, idx) => {
      if (idx > 0 && p - (pages[idx - 1] as number) > 1) pageItems.push('...');
      pageItems.push(p);
    });
  }

  return (
    <>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input type="search" placeholder="Cari nama, email, atau deskripsi…" value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            />
          </div>
          <button onClick={() => setShowFilter(true)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors',
              activeFilterCount > 0
                ? 'border-purple-500 bg-purple-500/15 text-purple-400'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200',
            )}>
            <Filter className="h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{activeFilterCount}</span>
            )}
          </button>
          <button onClick={() => void fetchLogs()} disabled={loading}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-sm transition-colors disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Active filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {role && (
              <span className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full">
                Role: {getRoleDisplayName(role as UserRole)}
                <button onClick={() => { setRole(''); setPage(1); }} className="text-slate-500 hover:text-slate-200"><X className="h-3 w-3" /></button>
              </span>
            )}
            {action && (
              <span className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full">
                Aksi: {ACTION_LABELS[action] ?? action}
                <button onClick={() => { setAction(''); setPage(1); }} className="text-slate-500 hover:text-slate-200"><X className="h-3 w-3" /></button>
              </span>
            )}
            {dateFrom && (
              <span className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full">
                Dari: {dateFrom}
                <button onClick={() => { setDateFrom(''); setPage(1); }} className="text-slate-500 hover:text-slate-200"><X className="h-3 w-3" /></button>
              </span>
            )}
            {dateTo && (
              <span className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full">
                Sampai: {dateTo}
                <button onClick={() => { setDateTo(''); setPage(1); }} className="text-slate-500 hover:text-slate-200"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}
          </div>
        )}

        {/* Count */}
        {meta && !loading && (
          <p className="text-sm text-slate-500">
            Menampilkan <span className="text-slate-300 font-medium">{from}–{to}</span> dari <span className="text-slate-300 font-medium">{meta.total}</span> entri
          </p>
        )}

        {/* Log list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="hidden lg:grid grid-cols-[160px_1fr_130px] gap-4 px-5 py-3 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Waktu</span><span>Aktivitas</span><span>IP Address</span>
          </div>

          {loading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            : logs.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <ScrollText className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">Tidak ada log yang sesuai</p>
                </div>
              )
              : logs.map((log, idx) => <LogRow key={log.id} log={log} isLast={idx === logs.length - 1} />)
          }
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />Sebelumnya
            </button>
            <div className="flex items-center gap-1">
              {pageItems.map((item, i) => item === '...'
                ? <span key={`e-${i}`} className="px-2 text-slate-600 text-sm">…</span>
                : <button key={item} onClick={() => setPage(item as number)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${page === item ? 'bg-purple-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                    {item}
                  </button>
              )}
            </div>
            <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Selanjutnya<ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {showFilter && (
        <FilterDrawer
          role={role} action={action} dateFrom={dateFrom} dateTo={dateTo}
          onApply={(f) => { setRole(f.role); setAction(f.action); setDateFrom(f.dateFrom); setDateTo(f.dateTo); setPage(1); }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </>
  );
}
