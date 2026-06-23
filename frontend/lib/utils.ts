import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DamageType, ReportStatus, UserRole } from '@/types';

/**
 * Gabungkan Tailwind class names dengan aman.
 * Fungsi ini dibutuhkan oleh semua komponen shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format tanggal ISO menjadi format Indonesia yang mudah dibaca */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format tanggal dengan waktu */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Kembalikan label Bahasa Indonesia untuk status laporan */
export function getStatusLabel(status: ReportStatus): string {
  const labels: Record<ReportStatus, string> = {
    PENDING: 'Menunggu Verifikasi',
    VERIFIED: 'Terverifikasi',
    IN_PROGRESS: 'Sedang Diperbaiki',
    RESOLVED: 'Selesai',
    REJECTED: 'Ditolak',
  };
  return labels[status];
}

/** Kembalikan warna Tailwind CSS untuk badge status laporan (dark-mode) */
export function getStatusColor(status: ReportStatus): string {
  const colors: Record<ReportStatus, string> = {
    PENDING:     'bg-amber-500/20 text-amber-300',
    VERIFIED:    'bg-blue-500/20 text-blue-300',
    IN_PROGRESS: 'bg-orange-500/20 text-orange-300',
    RESOLVED:    'bg-green-500/20 text-green-300',
    REJECTED:    'bg-red-500/20 text-red-300',
  };
  return colors[status];
}

/** Kembalikan label tingkat keparahan (1-5) */
export function getSeverityLabel(severity: number): string {
  const labels: Record<number, string> = {
    1: 'Sangat Ringan',
    2: 'Ringan',
    3: 'Sedang',
    4: 'Parah',
    5: 'Sangat Parah',
  };
  return labels[severity] || 'Tidak Diketahui';
}

/** Kembalikan warna untuk indikator tingkat keparahan */
export function getSeverityColor(severity: number): string {
  if (severity <= 1) return 'text-green-600';
  if (severity <= 2) return 'text-yellow-600';
  if (severity <= 3) return 'text-orange-600';
  return 'text-red-600';
}

/** Kembalikan warna hex untuk marker peta berdasarkan severity */
export function getSeverityMapColor(severity: number): string {
  if (severity <= 2) return '#22c55e'; // green-500
  if (severity === 3) return '#eab308'; // yellow-500
  if (severity === 4) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/** Kembalikan nama tampilan role yang ramah untuk pengguna */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    PUBLIC:         'Pelapor',
    VERIFIER:       'Admin Verifikator',
    FIELD_VERIFIER: 'Verifikator Lapangan',
    ADMIN:          'Super Admin',
  };
  return names[role];
}

/** Kembalikan class Tailwind untuk badge role (dark-mode) */
export function getRoleBadgeClass(role: UserRole): string {
  if (role === 'ADMIN')          return 'bg-purple-500/15 text-purple-400 border-purple-500/20';
  if (role === 'VERIFIER')       return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  if (role === 'FIELD_VERIFIER') return 'bg-orange-500/15 text-orange-400 border-orange-500/20';
  return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
}

/** Label keparahan untuk form pembuatan laporan (skala tindakan darurat) */
export function getFormSeverityLabel(severity: number): string {
  const labels: Record<number, string> = {
    1: 'Ringan',
    2: 'Sedang',
    3: 'Parah',
    4: 'Kritis',
    5: 'Darurat',
  };
  return labels[severity] ?? 'Tidak Diketahui';
}

/** Kembalikan label Indonesia untuk jenis kerusakan */
export function getDamageTypeLabel(type: DamageType): string {
  const labels: Record<DamageType, string> = {
    BERLUBANG: 'Berlubang',
    RETAK:     'Retak',
    AMBLAS:    'Amblas',
    BANJIR:    'Tergenang Air',
    LONGSOR:   'Longsor',
    LAINNYA:   'Lainnya',
  };
  return labels[type];
}
