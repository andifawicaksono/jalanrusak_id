'use client';

import useSWR from 'swr';
import { useState, useCallback, useMemo, useRef } from 'react';
import apiClient from '@/lib/axios';
import { BoundingBox, DamageType, MapFilters, MapMarker, ReportStatus } from '@/types';

// ─── Konstanta ────────────────────────────────────────────────────

/** Viewport awal: area Jakarta */
export const INITIAL_BBOX: BoundingBox = {
  swLat: -6.5, swLng: 106.5,
  neLat: -5.8, neLng: 107.3,
};

export const DEFAULT_FILTERS: MapFilters = {
  damageTypes: [],
  severityMin: 1,
  severityMax: 5,
  statuses: [],
};

// ─── SWR Fetcher ──────────────────────────────────────────────────

const fetcher = (url: string) =>
  apiClient.get<{ markers: MapMarker[]; total: number }>(url).then((r) => r.data);

// ─── Hook ─────────────────────────────────────────────────────────

interface UseMapDataOptions {
  initialBbox?: BoundingBox;
  initialMarkers?: MapMarker[];
}

export function useMapData(options: UseMapDataOptions = {}) {
  const { initialBbox = INITIAL_BBOX, initialMarkers } = options;

  const [bbox, setBbox] = useState<BoundingBox>(initialBbox);
  const [filters, setFiltersRaw] = useState<MapFilters>(DEFAULT_FILTERS);

  // Ref untuk debounce bbox (pan/zoom beruntun → jangan trigger fetch setiap event)
  const bboxTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Ref untuk debounce filter (300ms sesuai spesifikasi)
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Filter yang benar-benar diterapkan ke marker (setelah debounce)
  const [appliedFilters, setAppliedFilters] = useState<MapFilters>(DEFAULT_FILTERS);

  // ─── SWR key berubah saat bbox berubah → trigger re-fetch ──────
  const swrKey = useMemo(() => {
    const p = new URLSearchParams({
      swLat: bbox.swLat.toString(),
      swLng: bbox.swLng.toString(),
      neLat: bbox.neLat.toString(),
      neLng: bbox.neLng.toString(),
    });
    return `/reports/map-markers?${p}`;
  }, [bbox]);

  const { data, isLoading, error } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 15_000,
    // Data awal dari server (tidak perlu loading spinner pada render pertama)
    fallbackData: initialMarkers ? { markers: initialMarkers, total: initialMarkers.length } : undefined,
  });

  // ─── Client-side filter (pakai appliedFilters agar debounced) ───
  const filteredMarkers = useMemo(() => {
    const all = data?.markers ?? [];
    return all.filter((m) => {
      if (
        appliedFilters.damageTypes.length > 0 &&
        !appliedFilters.damageTypes.includes(m.damageType)
      ) return false;
      if (m.severity < appliedFilters.severityMin || m.severity > appliedFilters.severityMax)
        return false;
      if (
        appliedFilters.statuses.length > 0 &&
        !appliedFilters.statuses.includes(m.status)
      ) return false;
      return true;
    });
  }, [data, appliedFilters]);

  // ─── API: update bbox dengan debounce 500ms ───────────────────
  const updateBbox = useCallback((newBbox: BoundingBox) => {
    clearTimeout(bboxTimerRef.current);
    bboxTimerRef.current = setTimeout(() => setBbox(newBbox), 500);
  }, []);

  // ─── API: update filter dengan debounce 300ms ─────────────────
  const updateFilters = useCallback((newFilters: Partial<MapFilters>) => {
    setFiltersRaw((prev) => {
      const next = { ...prev, ...newFilters };
      clearTimeout(filterTimerRef.current);
      filterTimerRef.current = setTimeout(() => setAppliedFilters(next), 300);
      return next; // UI state update segera; marker update setelah 300ms
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersRaw(DEFAULT_FILTERS);
    clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => setAppliedFilters(DEFAULT_FILTERS), 300);
  }, []);

  return {
    /** Marker setelah filter client-side */
    markers: filteredMarkers,
    /** Total marker sebelum filter (jumlah raw dari server) */
    totalRaw: data?.markers.length ?? 0,
    isLoading,
    error,
    /** State filter UI (update segera, untuk checkbox/slider) */
    filters,
    updateFilters,
    resetFilters,
    updateBbox,
  };
}

// ─── Helper types ─────────────────────────────────────────────────

export const ALL_DAMAGE_TYPES: DamageType[] = [
  'BERLUBANG', 'RETAK', 'AMBLAS', 'BANJIR', 'LONGSOR', 'LAINNYA',
];

export const ALL_STATUSES: ReportStatus[] = [
  'PENDING', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED',
];
