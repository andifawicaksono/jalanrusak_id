'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users, Search, RefreshCw, ChevronDown,
  FileText, AlertCircle, Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import RoleGuard from '@/components/dashboard/RoleGuard';
import apiClient from '@/lib/axios';
import { cn, formatDate, getRoleDisplayName, getRoleBadgeClass } from '@/lib/utils';
import type { User, UserRole } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────

interface UserWithCount extends User {
  _count: { reports: number };
}

interface ApiListResponse {
  success: boolean;
  data: UserWithCount[];
}

// ─── Role options shown in the dropdown ──────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'PUBLIC',   label: 'Pelapor' },
  { value: 'VERIFIER', label: 'Admin Verifikator' },
  { value: 'ADMIN',    label: 'Super Admin' },
];

// ─── Page wrapper (RoleGuard) ────────────────────────────────────────

export default function UsersPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <UsersContent />
    </RoleGuard>
  );
}

// ─── Main content ─────────────────────────────────────────────────────

function UsersContent() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers]           = useState<UserWithCount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ─── Data fetching ────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApiListResponse>('/users');
      setUsers(res.data.data ?? []);
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const detail = e.response?.data?.message ?? e.message ?? 'unknown error';
      const status = e.response?.status ?? 'network';
      setError(`Gagal memuat pengguna [${status}]: ${detail}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // ─── Role change ─────────────────────────────────────────────────

  async function handleRoleChange(userId: string, newRole: UserRole) {
    if (changingId) return;
    setChangingId(userId);
    setOpenDropdown(null);
    try {
      const res = await apiClient.patch<{ data: User }>(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...res.data.data } : u)),
      );
    } catch {
      setError('Gagal mengubah role. Coba lagi.');
    } finally {
      setChangingId(null);
    }
  }

  // ─── Filter ───────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ─── Stats ────────────────────────────────────────────────────────

  const stats = {
    total:    users.length,
    pelapor:  users.filter((u) => u.role === 'PUBLIC').length,
    verifier: users.filter((u) => u.role === 'VERIFIER').length,
    admin:    users.filter((u) => u.role === 'ADMIN').length,
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-slate-950 p-6"
      onClick={() => setOpenDropdown(null)}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/20">
            <Users className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Kelola Pengguna</h1>
            <p className="text-sm text-slate-500">{stats.total} pengguna terdaftar</p>
          </div>
        </div>
        <button
          onClick={() => void loadUsers()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Muat Ulang
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',    value: stats.total,    cls: 'text-slate-100' },
          { label: 'Pelapor',  value: stats.pelapor,  cls: 'text-slate-400' },
          { label: 'Verifikator', value: stats.verifier, cls: 'text-blue-400' },
          { label: 'Super Admin', value: stats.admin,  cls: 'text-purple-400' },
        ].map(({ label, value, cls }) => (
          <div
            key={label}
            className="bg-slate-900 border border-slate-700/60 rounded-xl px-4 py-3"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', cls)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-300 text-xs underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PUBLIC', 'VERIFIER', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                roleFilter === r
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100',
              )}
            >
              {r === 'ALL' ? 'Semua' : getRoleDisplayName(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      {loading ? (
        <UserTableSkeleton />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Users className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Tidak ada pengguna yang cocok dengan pencarian</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden">
          {/* Table header — desktop only */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_140px_80px_120px] gap-4 px-5 py-3 border-b border-slate-700/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Pengguna</span>
            <span>Email</span>
            <span>Role</span>
            <span className="text-center">Laporan</span>
            <span className="text-center">Ganti Role</span>
          </div>

          {filtered.map((u, idx) => {
            const isSelf     = u.id === currentUser?.id;
            const isChanging = changingId === u.id;
            const displayName = u.roleInfo?.displayName ?? getRoleDisplayName(u.role);

            return (
              <div
                key={u.id}
                className={cn(
                  'grid md:grid-cols-[1fr_1fr_140px_80px_120px] grid-cols-1 gap-2 md:gap-4 px-5 py-4 items-center',
                  idx !== filtered.length - 1 && 'border-b border-slate-800',
                  isSelf && 'bg-blue-500/5',
                )}
              >
                {/* Name + date */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                        Anda
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bergabung {formatDate(u.createdAt)}
                  </p>
                </div>

                {/* Email */}
                <p className="text-sm text-slate-400 truncate hidden md:block">{u.email}</p>

                {/* Role badge */}
                <div>
                  <span
                    className={cn(
                      'inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border',
                      getRoleBadgeClass(u.role),
                    )}
                  >
                    {displayName}
                  </span>
                </div>

                {/* Report count */}
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>{u._count.reports}</span>
                </div>

                {/* Role change dropdown */}
                <div
                  className="relative flex justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isChanging ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  ) : (
                    <>
                      <button
                        disabled={isSelf}
                        onClick={() =>
                          setOpenDropdown(openDropdown === u.id ? null : u.id)
                        }
                        title={isSelf ? 'Tidak dapat mengubah role sendiri' : 'Ubah role'}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                          isSelf
                            ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600',
                        )}
                      >
                        Ubah
                        <ChevronDown className="h-3 w-3" />
                      </button>

                      {openDropdown === u.id && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                          {ROLE_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => void handleRoleChange(u.id, opt.value)}
                              className={cn(
                                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                                u.role === opt.value
                                  ? 'bg-blue-600/20 text-blue-300 font-medium'
                                  : 'text-slate-300 hover:bg-slate-700',
                              )}
                            >
                              {opt.label}
                              {u.role === opt.value && (
                                <span className="ml-2 text-xs text-blue-400">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────

function UserTableSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-4 px-5 py-4',
            i !== 5 && 'border-b border-slate-800',
          )}
        >
          <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-48 bg-slate-700 rounded animate-pulse hidden md:block" />
          <div className="h-5 w-24 bg-slate-700 rounded-full animate-pulse ml-auto md:ml-0" />
        </div>
      ))}
    </div>
  );
}
