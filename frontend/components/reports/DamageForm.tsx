'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle, ChevronLeft, ChevronsDown, Droplets,
  HelpCircle, Triangle, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DamageType } from '@/types';

// ─── Schema ─────────────────────────────────────────────────────────

const damageSchema = z.object({
  title: z.string()
    .min(5, 'Judul minimal 5 karakter')
    .max(200, 'Judul maksimal 200 karakter')
    .trim(),
  description: z.string()
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(2000, 'Deskripsi maksimal 2000 karakter')
    .trim(),
  damageType: z.enum(
    ['BERLUBANG', 'RETAK', 'AMBLAS', 'BANJIR', 'LONGSOR', 'LAINNYA'],
    { required_error: 'Pilih jenis kerusakan' },
  ),
  severity: z.number().int().min(1).max(5),
  isAnonymous: z.boolean(),
});

export type DamageFormData = z.infer<typeof damageSchema>;

// ─── Constants ───────────────────────────────────────────────────────

const DAMAGE_TYPES: {
  value: DamageType;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'BERLUBANG', label: 'Berlubang',  desc: 'Lubang pada aspal',    Icon: AlertCircle  },
  { value: 'RETAK',     label: 'Retak',      desc: 'Retak memanjang',      Icon: Zap          },
  { value: 'AMBLAS',    label: 'Amblas',     desc: 'Penurunan permukaan',  Icon: ChevronsDown },
  { value: 'BANJIR',    label: 'Tergenang',  desc: 'Drainase tersumbat',   Icon: Droplets     },
  { value: 'LONGSOR',   label: 'Longsor',    desc: 'Material menutupi jalan', Icon: Triangle  },
  { value: 'LAINNYA',   label: 'Lainnya',    desc: 'Kerusakan lain',       Icon: HelpCircle   },
];

const SEVERITY_CONFIG = [
  { value: 1, label: 'Ringan',  hex: '#22c55e' },
  { value: 2, label: 'Sedang',  hex: '#84cc16' },
  { value: 3, label: 'Parah',   hex: '#eab308' },
  { value: 4, label: 'Kritis',  hex: '#f97316' },
  { value: 5, label: 'Darurat', hex: '#ef4444' },
];

// ─── Props ───────────────────────────────────────────────────────────

interface DamageFormProps {
  defaultValues: {
    title: string;
    description: string;
    damageType: DamageType | null;
    severity: number;
    isAnonymous: boolean;
  };
  onNext: (data: DamageFormData) => void;
  onBack: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function DamageForm({
  defaultValues,
  onNext,
  onBack,
}: DamageFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DamageFormData>({
    resolver: zodResolver(damageSchema),
    defaultValues: {
      title:       defaultValues.title,
      description: defaultValues.description,
      damageType:  defaultValues.damageType ?? undefined,
      severity:    defaultValues.severity || 1,
      isAnonymous: defaultValues.isAnonymous,
    },
  });

  const severity      = watch('severity');
  const selectedType  = watch('damageType');
  const descLength    = watch('description')?.length ?? 0;
  const severityConf  = SEVERITY_CONFIG[severity - 1];

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">

      {/* ── Jenis Kerusakan ── */}
      <div className="space-y-2.5">
        <label className="text-sm font-medium text-gray-700 block">
          Jenis Kerusakan *
        </label>
        {errors.damageType && (
          <p className="text-xs text-red-600">{errors.damageType.message}</p>
        )}
        <div className="grid grid-cols-3 gap-2.5">
          {DAMAGE_TYPES.map(({ value, label, desc, Icon }) => {
            const active = selectedType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue('damageType', value, { shouldValidate: true })}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                  active
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                )}
              >
                <Icon
                  className={cn(
                    'h-7 w-7',
                    active ? 'text-blue-600' : 'text-gray-400',
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-semibold',
                    active ? 'text-blue-700' : 'text-gray-700',
                  )}
                >
                  {label}
                </span>
                <span className="text-[10px] text-gray-400 text-center leading-tight hidden sm:block">
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tingkat Keparahan ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Tingkat Keparahan *
          </label>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              color:           severityConf.hex,
              backgroundColor: `${severityConf.hex}18`,
            }}
          >
            {severity} — {severityConf.label}
          </span>
        </div>
        <Controller
          name="severity"
          control={control}
          render={({ field }) => (
            <input
              type="range"
              min={1} max={5} step={1}
              value={field.value}
              onChange={(e) => field.onChange(Number(e.target.value))}
              style={{ accentColor: severityConf.hex }}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
            />
          )}
        />
        <div className="flex justify-between text-[11px] px-0.5">
          {SEVERITY_CONFIG.map((s) => (
            <span
              key={s.value}
              style={{ color: severity === s.value ? s.hex : '#9ca3af' }}
              className="font-medium transition-colors"
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Judul ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">
          Judul Laporan *
        </label>
        <input
          {...register('title')}
          type="text"
          placeholder="Contoh: Jalan berlubang besar di depan SDN 1"
          className={cn(
            'w-full px-3 py-2.5 rounded-xl border text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
            errors.title ? 'border-red-400' : 'border-gray-300',
          )}
        />
        {errors.title && (
          <p className="text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* ── Deskripsi ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">
          Deskripsi *
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder="Deskripsikan kondisi kerusakan secara detail. Contoh: lubang ±1m × 0.5m kedalaman 20cm, sangat berbahaya saat malam hari..."
          className={cn(
            'w-full px-3 py-2.5 rounded-xl border text-sm resize-none',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
            errors.description ? 'border-red-400' : 'border-gray-300',
          )}
        />
        <div className="flex justify-between">
          {errors.description ? (
            <p className="text-xs text-red-600">{errors.description.message}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">{descLength}/2000</span>
        </div>
      </div>

      {/* ── Anonim Toggle ── */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-gray-700">Laporkan Secara Anonim</p>
          <p className="text-xs text-gray-500 mt-0.5">Nama Anda tidak akan ditampilkan publik</p>
        </div>
        <Controller
          name="isAnonymous"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
                field.value ? 'bg-blue-600' : 'bg-gray-300',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
                  field.value ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          )}
        />
      </div>

      {/* ── Navigasi ── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </button>
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Lanjutkan ke Foto →
        </button>
      </div>
    </form>
  );
}
