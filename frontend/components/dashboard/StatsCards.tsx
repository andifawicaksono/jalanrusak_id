'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
  XCircle, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────

export interface DashboardStats {
  readonly total: number;
  readonly pending: number;
  readonly inProgress: number;
  readonly resolved: number;
  readonly rejected: number;
  readonly critical: number;
}

interface StatCardConfig {
  readonly key: keyof DashboardStats;
  readonly label: string;
  readonly Icon: React.ComponentType<{ className?: string }>;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly valuColor: string;
}

// ─── Count-up animation ──────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress < 1) { frame = requestAnimationFrame(animate); }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}

// ─── Single Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  readonly label: string;
  readonly value: number;
  readonly Icon: React.ComponentType<{ className?: string }>;
  readonly iconBg: string;
  readonly iconColor: string;
  readonly valuColor: string;
  readonly delay?: number;
}

function StatCard({
  label, value, Icon, iconBg, iconColor, valuColor, delay = 0,
}: StatCardProps) {
  const animated = useCountUp(value, 800 + delay);

  return (
    <div className="bg-card border rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn('p-3 rounded-xl shrink-0', iconBg)}>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-2xl font-bold tabular-nums', valuColor)}>
          {animated.toLocaleString('id-ID')}
        </p>
        <p className="text-sm text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

// ─── Config ──────────────────────────────────────────────────────────

const STAT_CONFIGS: StatCardConfig[] = [
  {
    key:        'total',
    label:      'Total Laporan',
    Icon:       AlertTriangle,
    iconBg:     'bg-blue-100',
    iconColor:  'text-blue-600',
    valuColor:  'text-blue-700',
  },
  {
    key:        'pending',
    label:      'Menunggu Verifikasi',
    Icon:       Clock,
    iconBg:     'bg-yellow-100',
    iconColor:  'text-yellow-600',
    valuColor:  'text-yellow-700',
  },
  {
    key:        'inProgress',
    label:      'Sedang Diproses',
    Icon:       TrendingUp,
    iconBg:     'bg-orange-100',
    iconColor:  'text-orange-600',
    valuColor:  'text-orange-700',
  },
  {
    key:        'resolved',
    label:      'Selesai Diperbaiki',
    Icon:       CheckCircle2,
    iconBg:     'bg-green-100',
    iconColor:  'text-green-600',
    valuColor:  'text-green-700',
  },
  {
    key:        'rejected',
    label:      'Ditolak',
    Icon:       XCircle,
    iconBg:     'bg-red-100',
    iconColor:  'text-red-500',
    valuColor:  'text-red-600',
  },
  {
    key:        'critical',
    label:      'Kondisi Kritis',
    Icon:       Zap,
    iconBg:     'bg-rose-100',
    iconColor:  'text-rose-600',
    valuColor:  'text-rose-700',
  },
];

// ─── Main Component ──────────────────────────────────────────────────

interface StatsCardsProps {
  readonly stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAT_CONFIGS.map((config, idx) => (
        <StatCard
          key={config.key}
          label={config.label}
          value={stats[config.key]}
          Icon={config.Icon}
          iconBg={config.iconBg}
          iconColor={config.iconColor}
          valuColor={config.valuColor}
          delay={idx * 80}
        />
      ))}
    </div>
  );
}
