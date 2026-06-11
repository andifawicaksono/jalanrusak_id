import { Metadata } from 'next';
import StatsCards, { type DashboardStats } from '@/components/dashboard/StatsCards';
import ReportsTable from '@/components/dashboard/ReportsTable';
import RoleGuard from '@/components/dashboard/RoleGuard';
import DashboardMapClient from '@/components/dashboard/DashboardMapClient';
import type { MapMarker } from '@/types';

export const metadata: Metadata = {
  title: 'Dashboard Admin — JalanRusak',
};

// ─── Bounding box Indonesia (untuk statistik global) ─────────────────

const INDONESIA_BBOX = { swLat: -11, swLng: 95, neLat: 6, neLng: 141 };

// ─── Server-side stats fetch ──────────────────────────────────────────

async function fetchDashboardStats(): Promise<DashboardStats> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

  try {
    const res = await fetch(
      `${apiUrl}/reports/map-markers?swLat=${INDONESIA_BBOX.swLat}&swLng=${INDONESIA_BBOX.swLng}&neLat=${INDONESIA_BBOX.neLat}&neLng=${INDONESIA_BBOX.neLng}`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) throw new Error('fetch failed');

    const body = await res.json() as { markers: MapMarker[] };
    const markers = body.markers ?? [];

    return {
      total:      markers.length,
      pending:    markers.filter((m) => m.status === 'PENDING').length,
      inProgress: markers.filter(
        (m) => m.status === 'VERIFIED' || m.status === 'IN_PROGRESS',
      ).length,
      resolved:   markers.filter((m) => m.status === 'RESOLVED').length,
      rejected:   markers.filter((m) => m.status === 'REJECTED').length,
      critical:   markers.filter(
        (m) => m.severity >= 4 && m.status !== 'RESOLVED' && m.status !== 'REJECTED',
      ).length,
    };
  } catch {
    return { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0, critical: 0 };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const stats = await fetchDashboardStats();

  return (
    // RoleGuard adalah client component — redirect PUBLIC users ke /reports
    <RoleGuard allowedRoles={['ADMIN', 'VERIFIER']}>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
          <p className="text-muted-foreground mt-1">
            Ringkasan laporan dan manajemen status kerusakan jalan
          </p>
        </div>

        {/* Statistik — data dari SSR, animasi count-up di client */}
        <StatsCards stats={stats} />

        {/* Peta + Tabel — dua kolom di layar lebar */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Peta (2/5 lebar di xl) */}
          <div className="xl:col-span-2 bg-card border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h2 className="text-base font-semibold">Peta Kerusakan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle marker / heatmap
              </p>
            </div>
            <div className="h-[400px] p-3">
              <DashboardMapClient className="h-full" />
            </div>
          </div>

          {/* Tabel (3/5 lebar di xl) */}
          <div className="xl:col-span-3">
            <div className="mb-3">
              <h2 className="text-base font-semibold">Manajemen Laporan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verifikasi dan update status laporan masuk
              </p>
            </div>
            <ReportsTable initialTotal={stats.total} />
          </div>
        </div>

      </div>
    </RoleGuard>
  );
}
