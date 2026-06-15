'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Filter, RotateCcw } from 'lucide-react';
import { cn, getDamageTypeLabel, getStatusLabel, getSeverityLabel, getSeverityMapColor } from '@/lib/utils';
import type { DamageType, MapFilters, ReportStatus } from '@/types';
import { ALL_DAMAGE_TYPES, ALL_STATUSES, DEFAULT_FILTERS } from '@/hooks/useMapData';

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  /** Filter yang sedang aktif (dari useMapData) */
  filters: MapFilters;
  /** Callback — dipanggil setelah 300ms debounce dari MapFilters */
  onChange: (partial: Partial<MapFilters>) => void;
  /** Jumlah marker yang lolos filter (untuk badge) */
  count: number;
}

// ─── Sub-components ───────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function MapFilters({ filters, onChange, count }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // Local UI state — update segera saat user interaksi
  const [local, setLocal] = useState<MapFilters>(filters);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sinkron dari parent (misal saat reset dari luar)
  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  // Hitung apakah ada filter aktif (berbeda dari default)
  const hasActiveFilter =
    local.damageTypes.length > 0 ||
    local.statuses.length > 0 ||
    local.severityMin > DEFAULT_FILTERS.severityMin ||
    local.severityMax < DEFAULT_FILTERS.severityMax;

  function applyChange(partial: Partial<MapFilters>) {
    const next = { ...local, ...partial };
    setLocal(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 300);
  }

  function toggleDamageType(type: DamageType) {
    const next = local.damageTypes.includes(type)
      ? local.damageTypes.filter((d) => d !== type)
      : [...local.damageTypes, type];
    applyChange({ damageTypes: next });
  }

  function toggleStatus(status: ReportStatus) {
    const next = local.statuses.includes(status)
      ? local.statuses.filter((s) => s !== status)
      : [...local.statuses, status];
    applyChange({ statuses: next });
  }

  function handleReset() {
    setLocal(DEFAULT_FILTERS);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(DEFAULT_FILTERS), 300);
  }

  return (
    <div className="w-64 max-w-[calc(100vw-80px)]">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 w-full bg-slate-900 rounded-xl shadow-lg px-3 py-2.5',
          'hover:bg-slate-800 transition-colors text-sm font-medium text-slate-200 border border-slate-700',
          isOpen && 'rounded-b-none shadow-none border-b-0',
        )}
      >
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="flex-1 text-left">Filter</span>
        {hasActiveFilter && (
          <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
        )}
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full shrink-0">
          {count}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="bg-slate-900 border border-slate-700 border-t-0 rounded-b-xl rounded-tr-xl shadow-lg p-3 space-y-4">

          {/* Jenis kerusakan */}
          <FilterSection title="Jenis Kerusakan">
            <div className="grid grid-cols-2 gap-1">
              {ALL_DAMAGE_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-slate-100 select-none"
                >
                  <input
                    type="checkbox"
                    checked={local.damageTypes.includes(type)}
                    onChange={() => toggleDamageType(type)}
                    className="accent-blue-600 h-3.5 w-3.5 cursor-pointer"
                  />
                  {getDamageTypeLabel(type)}
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Keparahan */}
          <FilterSection title="Keparahan">
            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Min</span>
                  <span
                    className="font-medium"
                    style={{ color: getSeverityMapColor(local.severityMin) }}
                  >
                    {local.severityMin} — {getSeverityLabel(local.severityMin)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1" max="5" step="1"
                  value={local.severityMin}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    applyChange({ severityMin: Math.min(v, local.severityMax) });
                  }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Max</span>
                  <span
                    className="font-medium"
                    style={{ color: getSeverityMapColor(local.severityMax) }}
                  >
                    {local.severityMax} — {getSeverityLabel(local.severityMax)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1" max="5" step="1"
                  value={local.severityMax}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    applyChange({ severityMax: Math.max(v, local.severityMin) });
                  }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </FilterSection>

          {/* Status */}
          <FilterSection title="Status">
            <div className="space-y-1">
              {ALL_STATUSES.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-slate-100 select-none"
                >
                  <input
                    type="checkbox"
                    checked={local.statuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                    className="accent-blue-600 h-3.5 w-3.5 cursor-pointer"
                  />
                  {getStatusLabel(status)}
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Reset */}
          <button
            onClick={handleReset}
            disabled={!hasActiveFilter}
            className={cn(
              'flex items-center justify-center gap-1.5 w-full text-xs font-medium py-1.5 rounded-lg transition-colors',
              hasActiveFilter
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-slate-600 cursor-not-allowed',
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filter
          </button>
        </div>
      )}
    </div>
  );
}
