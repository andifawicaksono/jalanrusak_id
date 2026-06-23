'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users, Search, Plus, ChevronLeft, ChevronRight, XCircle,
  MoreVertical, Shield, Ban, UserCheck, UserX, RefreshCw, Loader2, X,
  Eye, EyeOff, Check, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDateTime, getRoleDisplayName, getRoleBadgeClass } from '@/lib/utils';
import {
  adminCreateUserSchema, adminEditUserSchema, PASSWORD_REQUIREMENTS,
  type AdminCreateUserFormData, type AdminEditUserFormData,
} from '@/lib/userValidation';
import type { User, UserRole, AccountStatus } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────

interface UserWithCount extends User {
  _count: { reports: number };
}

interface Meta {
  page: number; limit: number; total: number; totalPages: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'PUBLIC',         label: 'Pelapor'               },
  { value: 'VERIFIER',       label: 'Admin Verifikator'     },
  { value: 'FIELD_VERIFIER', label: 'Verifikator Lapangan'  },
  { value: 'ADMIN',          label: 'Super Admin'           },
];

const STATUS_BADGE: Record<AccountStatus, { label: string; cls: string }> = {
  ACTIVE:   { label: 'Aktif',    cls: 'bg-green-500/15 text-green-400 border-green-500/20'  },
  DISABLED: { label: 'Disabled', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  BANNED:   { label: 'Banned',   cls: 'bg-red-500/15 text-red-400 border-red-500/20'       },
};

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors';
const inputErrCls =
  'w-full bg-slate-800/60 border border-red-500/50 text-slate-100 placeholder:text-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors';
const selectCls =
  'bg-slate-800/60 border border-slate-700 text-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors';

// ─── Helpers ───────────────────────────────────────────────────────

function FieldError({ message }: { readonly message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

function PasswordChecklist({ password }: { readonly password: string }) {
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      {PASSWORD_REQUIREMENTS.map(({ label, test }) => {
        const met = test(password);
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors', met ? 'bg-green-500' : 'bg-slate-700')}>
              {met && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
            </div>
            <span className={cn('text-xs transition-colors', met ? 'text-green-400' : 'text-slate-500')}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create User Dialog ────────────────────────────────────────────

interface CreateUserDialogProps {
  readonly onClose:   () => void;
  readonly onCreated: () => void;
}

function CreateUserDialog({ onClose, onCreated }: CreateUserDialogProps) {
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminCreateUserFormData>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { role: 'PUBLIC' },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async (data: AdminCreateUserFormData) => {
    setApiError(null);
    try {
      await apiClient.post('/settings/users', {
        name:     data.name,
        email:    data.email,
        password: data.password,
        role:     data.role,
        phone:    data.phone || undefined,
      });
      toast.success('User berhasil dibuat.');
      onCreated();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal membuat user.';
      setApiError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <h2 className="font-semibold text-slate-100">Buat User Baru</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {apiError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />{apiError}
              </div>
            )}

            {/* Nama */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Lengkap <span className="text-red-400">*</span></label>
              <input type="text" placeholder="John Doe" className={errors.name ? inputErrCls : inputCls} {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input type="email" placeholder="john@example.com" className={errors.email ? inputErrCls : inputCls} {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role <span className="text-red-400">*</span></label>
              <select className={errors.role ? inputErrCls : inputCls} {...register('role')}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <FieldError message={errors.role?.message} />
            </div>

            {/* No. Telepon */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">No. Telepon <span className="text-slate-500 font-normal text-xs">(opsional)</span></label>
              <input type="tel" placeholder="08xxxxxxxxxx" className={errors.phone ? inputErrCls : inputCls} {...register('phone')} />
              <FieldError message={errors.phone?.message} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="Min. 8 karakter"
                  className={`${errors.password ? inputErrCls : inputCls} pr-11`}
                  {...register('password')} />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.password?.message} />
              <PasswordChecklist password={passwordValue} />
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Konfirmasi Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} placeholder="Ulangi password"
                  className={`${errors.confirmPassword ? inputErrCls : inputCls} pr-11`}
                  {...register('confirmPassword')} />
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.confirmPassword?.message} />
            </div>
          </div>

          <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-800 shrink-0">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2.5 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors disabled:opacity-50">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Dialog ──────────────────────────────────────────────

interface EditUserDialogProps {
  readonly user:      UserWithCount;
  readonly onClose:   () => void;
  readonly onUpdated: () => void;
}

function EditUserDialog({ user, onClose, onUpdated }: EditUserDialogProps) {
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminEditUserFormData>({
    resolver: zodResolver(adminEditUserSchema),
    defaultValues: {
      name:            user.name,
      email:           user.email,
      role:            user.role,
      phone:           user.phone ?? '',
      password:        '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async (data: AdminEditUserFormData) => {
    setApiError(null);
    try {
      await apiClient.patch(`/settings/users/${user.id}`, {
        name:     data.name,
        email:    data.email,
        role:     data.role,
        phone:    data.phone || undefined,
        password: data.password && data.password.length > 0 ? data.password : undefined,
      });
      toast.success('Data user berhasil diperbarui.');
      onUpdated();
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal memperbarui data user.';
      setApiError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-100">Edit User</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {apiError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />{apiError}
              </div>
            )}

            {/* Nama */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nama Lengkap <span className="text-red-400">*</span></label>
              <input type="text" className={errors.name ? inputErrCls : inputCls} {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input type="email" className={errors.email ? inputErrCls : inputCls} {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role <span className="text-red-400">*</span></label>
              <select className={errors.role ? inputErrCls : inputCls} {...register('role')}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <FieldError message={errors.role?.message} />
            </div>

            {/* No. Telepon */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">No. Telepon <span className="text-slate-500 font-normal text-xs">(opsional)</span></label>
              <input type="tel" placeholder="08xxxxxxxxxx" className={errors.phone ? inputErrCls : inputCls} {...register('phone')} />
              <FieldError message={errors.phone?.message} />
            </div>

            {/* Password section */}
            <div className="border-t border-slate-800 pt-3">
              <p className="text-xs text-slate-500 mb-3">Ganti Password <span className="text-slate-600">(kosongkan jika tidak ingin mengubah)</span></p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password Baru</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} placeholder="Kosongkan jika tidak diganti"
                    className={`${errors.password ? inputErrCls : inputCls} pr-11`}
                    {...register('password')} />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError message={errors.password?.message} />
                <PasswordChecklist password={passwordValue} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} placeholder="Ulangi password baru"
                    className={`${errors.confirmPassword ? inputErrCls : inputCls} pr-11`}
                    {...register('confirmPassword')} />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError message={errors.confirmPassword?.message} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-800 shrink-0">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2.5 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors disabled:opacity-50">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────

interface ConfirmDialogProps {
  readonly message:      string;
  readonly onConfirm:    () => void;
  readonly onCancel:     () => void;
  readonly loading:      boolean;
  readonly confirmLabel: string;
  readonly confirmCls:   string;
}

function ConfirmDialog({ message, onConfirm, onCancel, loading, confirmLabel, confirmCls }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <p className="text-sm text-slate-300 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50">Batal</button>
          <button onClick={onConfirm} disabled={loading} className={cn('flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50', confirmCls)}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Action Menu ───────────────────────────────────────────────────

interface ActionMenuProps {
  readonly user:           UserWithCount;
  readonly isSelf:         boolean;
  readonly onEdit:         () => void;
  readonly onRoleChange:   (role: UserRole) => void;
  readonly onStatusChange: (status: AccountStatus) => void;
}

function ActionMenu({ user, isSelf, onEdit, onRoleChange, onStatusChange }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  if (isSelf) return <span className="text-xs text-slate-600 px-2">—</span>;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <button onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition-colors border-b border-slate-700">
              <Pencil className="h-3.5 w-3.5 text-slate-500" />Edit Data
            </button>
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ubah Role</div>
            {ROLE_OPTIONS.filter((r) => r.value !== user.role).map((r) => (
              <button key={r.value} onClick={() => { onRoleChange(r.value); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition-colors">
                <Shield className="h-3.5 w-3.5 text-slate-500" />{r.label}
              </button>
            ))}
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-t border-b border-slate-700">Status Akun</div>
            {user.accountStatus !== 'ACTIVE'   && <button onClick={() => { onStatusChange('ACTIVE');   setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-green-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"><UserCheck className="h-3.5 w-3.5" />Aktifkan</button>}
            {user.accountStatus !== 'DISABLED'  && <button onClick={() => { onStatusChange('DISABLED'); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"><UserX className="h-3.5 w-3.5" />Nonaktifkan</button>}
            {user.accountStatus !== 'BANNED'    && <button onClick={() => { onStatusChange('BANNED');   setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"><Ban className="h-3.5 w-3.5" />Ban Akun</button>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-800 animate-pulse">
      <div className="h-8 w-8 rounded-full bg-slate-800 shrink-0" />
      <div className="flex-1 space-y-1.5"><div className="h-3.5 w-36 bg-slate-800 rounded" /><div className="h-3 w-48 bg-slate-800 rounded" /></div>
      <div className="h-5 w-20 bg-slate-800 rounded-full hidden md:block" />
      <div className="h-5 w-16 bg-slate-800 rounded-full hidden lg:block" />
      <div className="h-6 w-6 bg-slate-800 rounded ml-auto" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function SettingsUsersPage() {
  const { user: currentUser } = useAuthStore();

  const [users,   setUsers]   = useState<UserWithCount[]>([]);
  const [meta,    setMeta]    = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter,      setRoleFilter]      = useState<UserRole | ''>('');
  const [statusFilter,    setStatusFilter]    = useState<AccountStatus | ''>('');
  const [page,            setPage]            = useState(1);

  const [showCreate,  setShowCreate]  = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithCount | null>(null);
  const [confirm, setConfirm]         = useState<{
    userId:  string;
    message: string;
    label:   string;
    cls:     string;
    action:  () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(v); setPage(1); }, 300);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter)      params.role   = roleFilter;
      if (statusFilter)    params.status = statusFilter;

      const res = await apiClient.get<{ data: UserWithCount[]; meta: Meta }>('/settings/users', { params });
      setUsers(res.data.data ?? []);
      setMeta(res.data.meta ?? null);
    } catch {
      setError('Gagal memuat data user. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = (userId: string, userEmail: string, newRole: UserRole) => {
    setConfirm({
      userId,
      message: `Ubah role ${userEmail} menjadi "${getRoleDisplayName(newRole)}"?`,
      label:   'Ubah Role',
      cls:     'bg-blue-600 hover:bg-blue-500',
      action:  async () => {
        await apiClient.patch(`/settings/users/${userId}/role`, { role: newRole });
        toast.success('Role berhasil diubah.');
        void fetchUsers();
      },
    });
  };

  const STATUS_MESSAGES: Record<AccountStatus, string> = {
    ACTIVE:   'Akun akan diaktifkan kembali.',
    DISABLED: 'User tidak dapat login sampai diaktifkan kembali.',
    BANNED:   'Akun akan ditandai sebagai diblokir secara permanen.',
  };
  const STATUS_LABELS: Record<AccountStatus, string> = { ACTIVE: 'Aktifkan', DISABLED: 'Nonaktifkan', BANNED: 'Ban' };
  const STATUS_CLS: Record<AccountStatus, string>    = { ACTIVE: 'bg-green-600 hover:bg-green-500', DISABLED: 'bg-amber-600 hover:bg-amber-500', BANNED: 'bg-red-600 hover:bg-red-500' };

  const handleStatusChange = (userId: string, userEmail: string, newStatus: AccountStatus) => {
    setConfirm({
      userId,
      message: `${STATUS_MESSAGES[newStatus]} User: ${userEmail}`,
      label:   STATUS_LABELS[newStatus],
      cls:     STATUS_CLS[newStatus],
      action:  async () => {
        await apiClient.patch(`/settings/users/${userId}/status`, { status: newStatus });
        toast.success('Status akun berhasil diubah.');
        void fetchUsers();
      },
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.action();
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  };

  const pageItems: (number | '...')[] = [];
  if (meta) {
    const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1);
    pages.forEach((p, idx) => {
      if (idx > 0 && p - (pages[idx - 1] as number) > 1) pageItems.push('...');
      pageItems.push(p);
    });
  }

  const from = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const to   = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input type="search" placeholder="Cari nama atau email…" value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as UserRole | ''); setPage(1); }} className={`${selectCls} min-w-[175px]`}>
            <option value="">Semua Role</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as AccountStatus | ''); setPage(1); }} className={`${selectCls} min-w-[155px]`}>
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="DISABLED">Disabled</option>
            <option value="BANNED">Banned</option>
          </select>
          <button onClick={() => void fetchUsers()} disabled={loading} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-sm transition-colors disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors shrink-0">
            <Plus className="h-4 w-4" />Buat User
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}
          </div>
        )}

        {meta && !loading && (
          <p className="text-sm text-slate-500">
            Menampilkan <span className="text-slate-300 font-medium">{from}–{to}</span> dari <span className="text-slate-300 font-medium">{meta.total}</span> user
          </p>
        )}

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="hidden lg:grid grid-cols-[1fr_1fr_140px_120px_60px_44px] gap-4 px-5 py-3 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Pengguna</span><span>Email</span><span>Role</span><span>Status</span><span className="text-center">Laporan</span><span />
          </div>

          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            : users.length === 0
              ? <div className="flex flex-col items-center justify-center py-16 text-slate-500"><Users className="h-10 w-10 mb-3 opacity-30" /><p className="text-sm">Tidak ada user yang sesuai</p></div>
              : users.map((u, idx) => {
                  const isSelf      = u.id === currentUser?.id;
                  const statusBadge = STATUS_BADGE[u.accountStatus ?? 'ACTIVE'];
                  return (
                    <div key={u.id} className={cn(
                      'grid lg:grid-cols-[1fr_1fr_140px_120px_60px_44px] grid-cols-1 gap-2 lg:gap-4 px-5 py-4 items-center',
                      idx !== users.length - 1 && 'border-b border-slate-800',
                      isSelf && 'bg-purple-500/5',
                    )}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
                          {u.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {u.name}
                            {isSelf && <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">Anda</span>}
                          </p>
                          <p className="text-xs text-slate-500 truncate lg:hidden">{u.email}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {u.lastLoginAt ? `Login ${formatDateTime(u.lastLoginAt)}` : 'Belum pernah login'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 truncate hidden lg:block">{u.email}</p>
                      <div>
                        <span className={cn('inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border', getRoleBadgeClass(u.role))}>
                          {u.roleInfo?.displayName ?? getRoleDisplayName(u.role)}
                        </span>
                      </div>
                      <div>
                        <span className={cn('inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border', statusBadge.cls)}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 text-center hidden lg:block">{u._count?.reports ?? 0}</p>
                      <div className="flex justify-end lg:justify-center">
                        <ActionMenu
                          user={u} isSelf={isSelf}
                          onEdit={() => setEditingUser(u)}
                          onRoleChange={(role) => handleRoleChange(u.id, u.email, role)}
                          onStatusChange={(status) => handleStatusChange(u.id, u.email, status)}
                        />
                      </div>
                    </div>
                  );
                })
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

      {showCreate && (
        <CreateUserDialog onClose={() => setShowCreate(false)} onCreated={() => void fetchUsers()} />
      )}
      {editingUser && (
        <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} onUpdated={() => void fetchUsers()} />
      )}
      {confirm && (
        <ConfirmDialog
          message={confirm.message} loading={confirmLoading}
          confirmLabel={confirm.label} confirmCls={confirm.cls}
          onConfirm={() => void runConfirm()} onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
