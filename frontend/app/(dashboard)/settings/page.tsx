'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, Shield, Wrench, Ban, UserX, Activity } from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn } from '@/lib/utils';
import type { AdminStats } from '@/types';

// ─── Stat card ────────────────────────────────────────────────────

interface StatCardProps {
  readonly label:  string;
  readonly value:  number;
  readonly icon:   React.ElementType;
  readonly color:  string;
  readonly bgColor: string;
}

function StatCard({ label, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', bgColor)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={cn('text-3xl font-bold mt-0.5', color)}>{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
      <div className="h-11 w-11 rounded-xl bg-slate-800 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 bg-slate-800 rounded" />
        <div className="h-7 w-16 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ data: AdminStats }>('/settings/stats')
      .then((res) => setStats(res.data.data ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const roleCards = stats ? [
    { label: 'Total User',             value: stats.total,                icon: Users,     color: 'text-slate-300',  bgColor: 'bg-slate-700/50' },
    { label: 'Pelapor',                value: stats.byRole.pelapor,       icon: UserCheck, color: 'text-slate-400',  bgColor: 'bg-slate-800'    },
    { label: 'Admin Verifikator',      value: stats.byRole.verifier,      icon: Shield,    color: 'text-blue-400',   bgColor: 'bg-blue-500/15'  },
    { label: 'Verifikator Lapangan',   value: stats.byRole.fieldVerifier, icon: Wrench,    color: 'text-orange-400', bgColor: 'bg-orange-500/15'},
    { label: 'Super Admin',            value: stats.byRole.admin,         icon: Shield,    color: 'text-purple-400', bgColor: 'bg-purple-500/15'},
  ] : [];

  const statusCards = stats ? [
    { label: 'User Aktif',    value: stats.byStatus.active,   icon: Activity, color: 'text-green-400', bgColor: 'bg-green-500/15' },
    { label: 'User Disabled', value: stats.byStatus.disabled, icon: UserX,    color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
    { label: 'User Banned',   value: stats.byStatus.banned,   icon: Ban,      color: 'text-red-400',   bgColor: 'bg-red-500/15'   },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Role stats */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Statistik Role
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : roleCards.map((c) => <StatCard key={c.label} {...c} />)
          }
        </div>
      </section>

      {/* Status stats */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Statistik Status Akun
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : statusCards.map((c) => <StatCard key={c.label} {...c} />)
          }
        </div>
      </section>
    </div>
  );
}
